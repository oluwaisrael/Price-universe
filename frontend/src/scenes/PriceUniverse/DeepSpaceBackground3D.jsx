/**
 * DeepSpaceBackground3D.jsx — AAA Cinematic Universe Background
 *
 * Architecture: 8 depth layers rendered as fullscreen quads via R3F + drei.
 * Every layer is a ShaderMaterial — zero image assets, zero PNG textures.
 * Blending is additive throughout (THREE.AdditiveBlending) except the base
 * star field which writes to the framebuffer normally.
 *
 * Layer order (back → front):
 *   0. VoidBase         — pure black gradient, sets the mood
 *   1. StarFieldFar     — 60k tiny instanced points, colour-varied
 *   2. StarFieldMid     — 18k medium instanced points
 *   3. StarFieldNear    — 3k bright accent stars, occasional lens glint
 *   4. NebulaDrift      — 5 large FBM quads, extremely soft, additive
 *   5. DustLane         — 3 large curl-noise quads, subtle warm/cool tones
 *   6. AtmosphericHaze  — single radial gradient quad, colour-bridge layer
 *   7. DistantPlanets   — 4 procedural sphere impostors, edge-placed, dim
 *
 * Performance targets:
 *   — M1 MacBook Air: stable 60 fps
 *   — Mid-range GPU:  stable 45+ fps
 *   — All noise is 2D FBM (no 3D volumetric ray-march)
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Shared GLSL utilities ────────────────────────────────────────────────────

const GLSL_NOISE = /* glsl */ `
// Hash without sin — Dave Hoskins
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453123);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Value noise
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// FBM — 5 octaves
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.1 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// Domain-warped FBM for extra organicism
float wfbm(vec2 p, float warpStr) {
  vec2 q = vec2(fbm(p + vec2(0.0, 0.0)),
                fbm(p + vec2(5.2, 1.3)));
  return fbm(p + warpStr * q);
}
`

// ─── LAYER 0 — Void Base ─────────────────────────────────────────────────────
// Radial gradient from very-deep-navy at centre to pure black at edges.
// This is what kills the "pasted PNG on white" feeling.

const voidVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);;
}
`
const voidFrag = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform vec2  uRes;

void main() {
  vec2 uv = vUv - 0.5;
  float dist = length(uv * vec2(uRes.x / uRes.y, 1.0));

  // Extremely dark navy-black base
  vec3 col = mix(vec3(0.012, 0.010, 0.022), vec3(0.0), smoothstep(0.0, 0.7, dist));

  // Barely-visible warm core hint — will be reinforced by nebula layers
  col += vec3(0.008, 0.004, 0.001) * (1.0 - smoothstep(0.0, 0.3, dist));

  gl_FragColor = vec4(col, 1.0);
}
`

// ─── STAR FIELD — shared vertex shader ───────────────────────────────────────

const starVert = /* glsl */ `
attribute float aSize;
attribute vec3  aColor;
attribute float aTwinkle;
varying   vec3  vColor;
uniform   float uTime;
uniform   float uPixelRatio;

void main() {
  vColor = aColor;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  // Subtle twinkle: ±10% size modulation
  float twinkle = 1.0 + 0.10 * sin(uTime * aTwinkle + position.x * 17.3);
  gl_PointSize = aSize * uPixelRatio * twinkle * (300.0 / -mvPos.z);
  gl_Position  = projectionMatrix * mvPos;
}
`

const starFrag = /* glsl */ `
varying vec3 vColor;
void main() {
  vec2  uv   = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;
  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
  // Soft diffraction spike — very subtle
  float spike = max(0.0, 1.0 - abs(uv.x) * 12.0) * max(0.0, 1.0 - dist * 8.0);
  spike += max(0.0, 1.0 - abs(uv.y) * 12.0) * max(0.0, 1.0 - dist * 8.0);
  alpha = clamp(alpha + spike * 0.25, 0.0, 1.0);
  gl_FragColor = vec4(vColor * alpha, alpha);
}
`

function makeStarGeometry(count, spread, sizeRange, colourPalette, depthRange) {
  const positions = new Float32Array(count * 3)
  const sizes     = new Float32Array(count)
  const colors    = new Float32Array(count * 3)
  const twinkles  = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    // Distribute on a hemisphere shell — avoids clustering artefacts
    const theta = Math.random() * Math.PI * 2
    const phi   = Math.acos(2 * Math.random() - 1)
    const r     = spread[0] + Math.random() * (spread[1] - spread[0])

    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55 // flatten vertically
    positions[i * 3 + 2] = depthRange[0] + Math.random() * (depthRange[1] - depthRange[0])

    sizes[i] = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0])

    const col = colourPalette[Math.floor(Math.random() * colourPalette.length)]
    colors[i * 3]     = col[0]
    colors[i * 3 + 1] = col[1]
    colors[i * 3 + 2] = col[2]

    twinkles[i] = 0.3 + Math.random() * 4.0
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes,     1))
  geo.setAttribute('aColor',   new THREE.BufferAttribute(colors,    3))
  geo.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles,  1))
  return geo
}

// ─── Star colour palettes ─────────────────────────────────────────────────────
// Real stellar colours — blue giants, yellow dwarfs, orange K-type, red dwarfs, white

const FAR_PALETTE = [
  [0.55, 0.62, 0.82], // blue-white
  [0.75, 0.75, 0.80], // white
  [0.82, 0.78, 0.65], // pale yellow
  [0.70, 0.65, 0.75], // lavender
  [0.60, 0.70, 0.90], // cool blue
]

const MID_PALETTE = [
  [0.80, 0.82, 0.95], // blue-white
  [0.90, 0.88, 0.80], // warm white
  [0.95, 0.85, 0.65], // yellow
  [0.85, 0.70, 0.60], // orange
  [0.70, 0.80, 1.00], // azure
]

const NEAR_PALETTE = [
  [1.00, 1.00, 1.00], // brilliant white
  [0.90, 0.95, 1.00], // ice blue
  [1.00, 0.95, 0.80], // warm gold
  [0.95, 0.80, 0.70], // orange accent
  [0.80, 0.90, 1.00], // cool blue
]

// ─── LAYERS 4–5 — Nebula + Dust ──────────────────────────────────────────────

const nebulaVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const nebulaFrag = /* glsl */ `
${GLSL_NOISE}

varying vec2 vUv;
uniform float uTime;
uniform vec2  uOffset;
uniform float uScale;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform float uOpacity;
uniform float uWarp;
uniform float uMaskRadius; // 0 = no masking, 1 = fully vignette-masked

void main() {
  vec2 uv = (vUv - 0.5 + uOffset) * uScale;

  // Domain-warped FBM for organic volumetric look
  float n = wfbm(uv, uWarp);

  // Second pass for fine structure
  float n2 = fbm(uv * 2.3 + vec2(n * 0.8, n * 0.6) + 3.7);

  // Combine: large structure dominant, fine detail subtle
  float cloud = n * 0.75 + n2 * 0.25;

  // Radial mask — fades to nothing at edges; this is what prevents hard boundaries
  float dist = length(vUv - 0.5);
  float mask = 1.0 - smoothstep(0.0, uMaskRadius, dist);
  mask = pow(mask, 2.2); // gamma curve for very soft fade

  // Threshold — only the upper 40% of density shows; this creates negative space
  float density = smoothstep(0.38, 0.78, cloud) * mask;

  // Colour by density: sparse = colorA, dense = colorB
  vec3 col = mix(uColorA, uColorB, density * 0.6);

  float alpha = density * uOpacity;
  // Soft clamp — never fully opaque
  alpha = min(alpha, uOpacity * 0.85);

  gl_FragColor = vec4(col * alpha, alpha);
}
`

// ─── LAYER 6 — Atmospheric Colour Bridge ─────────────────────────────────────
// The key layer that replaces hard orange/cyan splits with a continuous gradient.
// Five large overlapping radial gradients composited additively.

const hazeFrag = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform vec2  uRes;

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;

  // ── Colour stops for the continuous spectrum ──────────────────────────────
  // Orange anchor (Jumia galaxy side — left-ish)
  vec2  cOrange  = vec2(0.18, 0.52);
  float rOrange  = 0.55;
  vec3  colOrange = vec3(0.06, 0.02, 0.00);

  // Amber transition
  vec2  cAmber   = vec2(0.35, 0.55);
  float rAmber   = 0.42;
  vec3  colAmber  = vec3(0.04, 0.01, 0.01);

  // Purple bridge — centre
  vec2  cPurple  = vec2(0.50, 0.48);
  float rPurple  = 0.50;
  vec3  colPurple = vec3(0.04, 0.01, 0.06);

  // Deep blue transition
  vec2  cBlue    = vec2(0.65, 0.52);
  float rBlue    = 0.42;
  vec3  colBlue   = vec3(0.00, 0.01, 0.05);

  // Cyan anchor (Jiji galaxy side — right-ish)
  vec2  cCyan    = vec2(0.82, 0.50);
  float rCyan    = 0.55;
  vec3  colCyan   = vec3(0.00, 0.02, 0.06);

  // Correct aspect ratio for distances
  vec2 uvA = vec2(uv.x * aspect, uv.y);

  float dOrange  = length(uvA - vec2(cOrange.x  * aspect, cOrange.y));
  float dAmber   = length(uvA - vec2(cAmber.x   * aspect, cAmber.y));
  float dPurple  = length(uvA - vec2(cPurple.x  * aspect, cPurple.y));
  float dBlue    = length(uvA - vec2(cBlue.x    * aspect, cBlue.y));
  float dCyan    = length(uvA - vec2(cCyan.x    * aspect, cCyan.y));

  vec3 col = vec3(0.0);
  col += colOrange  * (1.0 - smoothstep(0.0, rOrange,  dOrange));
  col += colAmber   * (1.0 - smoothstep(0.0, rAmber,   dAmber));
  col += colPurple  * (1.0 - smoothstep(0.0, rPurple,  dPurple));
  col += colBlue    * (1.0 - smoothstep(0.0, rBlue,    dBlue));
  col += colCyan    * (1.0 - smoothstep(0.0, rCyan,    dCyan));

  // Slow drift — barely perceptible
  float drift = sin(uTime * 0.04) * 0.005;
  col += col * drift;

  // Overall vignette — darken edges to keep depth
  float vignette = 1.0 - smoothstep(0.2, 1.0, length((uv - 0.5) * vec2(aspect, 1.0)));
  col *= vignette;

  gl_FragColor = vec4(col, 1.0);
}
`

// ─── LAYER 7 — Distant Planets ───────────────────────────────────────────────
// Procedural sphere impostors — no mesh, just signed-sphere distance in frag.

const planetVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const planetFrag = /* glsl */ `
${GLSL_NOISE}

varying vec2 vUv;
uniform vec3  uBaseColor;
uniform vec3  uAtmColor;
uniform float uSize;
uniform vec2  uCenter;    // 0-1 UV space
uniform float uLightDir;  // -1..1 horizontal light direction
uniform float uOpacity;
uniform float uAspect;

void main() {
  vec2 uv = vUv;
  // Correct for aspect
  vec2 p = (uv - uCenter) * vec2(uAspect, 1.0);
  float r = uSize * 0.5;
  float d = length(p);

  if (d > r * 1.6) discard;

  // Sphere SDF
  float sphere = r - d;
  float edge   = smoothstep(0.0, r * 0.12, sphere);

  // Rim glow (atmospheric scattering)
  float rim = smoothstep(r * 0.92, r, d) * smoothstep(r * 1.4, r * 0.95, d);

  // Simple diffuse — light comes from slight upper-left or right
  float ndotl = dot(normalize(vec2(p.x / max(d, 0.0001), p.y / max(d, 0.0001))),
                    normalize(vec2(uLightDir, 0.25)));
  float diffuse = clamp(ndotl * 0.5 + 0.5, 0.15, 1.0);

  // Band / cloud pattern
  float bands  = fbm(vec2(p.x * 6.0, p.y * 8.0) + 4.0);
  float cloud  = fbm(vec2(p.x * 3.0 + bands, p.y * 4.0) + 1.3);

  vec3 col = uBaseColor;
  col = mix(col, uBaseColor * 1.3, cloud * 0.3);
  col *= diffuse;

  // Atmosphere rim
  col = mix(col, uAtmColor, rim * 0.7);

  // Fade at edges
  float alpha = edge * uOpacity;
  // Planet is VERY dim — never brighter than nebula
  col = col * 0.35;

  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
`

// ─── Nebula configurations ────────────────────────────────────────────────────
// 5 quads — each sits at a different depth, offset, scale, and colour.
// Colors are deliberately undersaturated so galaxies pop.

const NEBULA_CONFIGS = [
  {
    // Primary nebula — top-left corner only
    offset: [-0.28, 0.22], scale: 1.4, warp: 1.8, maskRadius: 0.38,
    colorA: [0.03, 0.01, 0.08], colorB: [0.06, 0.02, 0.14],
    opacity: 0.35, z: -95, size: 120,
  },
  {
    // Secondary soft cloud — upper-left, barely visible
    offset: [-0.20, 0.30], scale: 1.8, warp: 2.2, maskRadius: 0.30,
    colorA: [0.02, 0.01, 0.06], colorB: [0.04, 0.01, 0.10],
    opacity: 0.22, z: -130, size: 100,
  },
]

// ─── Dust lane configurations ─────────────────────────────────────────────────

const DUST_CONFIGS = [
  {
    offset: [-0.22, 0.18], scale: 2.2, warp: 3.0, maskRadius: 0.32,
    colorA: [0.02, 0.01, 0.06], colorB: [0.05, 0.02, 0.10],
    opacity: 0.15, z: -80, size: 90,
  },
]

// ─── Planet configurations ────────────────────────────────────────────────────
// Low contrast, edge-placed, partially cut off by frame.

const PLANET_CONFIGS = [
  {
    // Warm ochre gas giant — top-left edge
    center: [-0.08, 0.82], size: 0.11,
    baseColor: [0.22, 0.13, 0.06], atmColor: [0.35, 0.18, 0.06],
    lightDir: 0.6, opacity: 0.30, z: -70,
  },
  {
    // Icy blue distant planet — right edge, partially clipped
    center: [1.06, 0.38], size: 0.09,
    baseColor: [0.06, 0.10, 0.22], atmColor: [0.10, 0.20, 0.40],
    lightDir: -0.5, opacity: 0.28, z: -90,
  },
  {
    // Deep purple ringed world — bottom-right
    center: [0.92, 0.10], size: 0.07,
    baseColor: [0.10, 0.05, 0.18], atmColor: [0.18, 0.08, 0.28],
    lightDir: 0.4, opacity: 0.22, z: -110,
  },
  {
    // Far amber moon — top-right, very dim
    center: [0.88, 0.78], size: 0.05,
    baseColor: [0.18, 0.10, 0.04], atmColor: [0.25, 0.15, 0.06],
    lightDir: -0.3, opacity: 0.18, z: -130,
  },
]

// ─── Helper: fullscreen quad geometry ────────────────────────────────────────

function fullscreenQuad() {
  const geo = new THREE.PlaneGeometry(2, 2)
  // Scale UVs to 0-1
  return geo
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DeepSpaceBackground3D() {
  const { size, gl } = useThree()
  const pixelRatio   = gl.getPixelRatio()
  const timeRef      = useRef(0)

  // ── Void base material ───────────────────────────────────────────────────
  const voidMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   voidVert,
    fragmentShader: voidFrag,
    uniforms: {
      uTime: { value: 0 },
      uRes:  { value: new THREE.Vector2(size.width, size.height) },
    },
    depthTest:  false,
    depthWrite: false,
  }), [])

  // ── Haze material ────────────────────────────────────────────────────────
  const hazeMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   voidVert,   // same trivial vert
    fragmentShader: hazeFrag,
    uniforms: {
      uTime: { value: 0 },
      uRes:  { value: new THREE.Vector2(size.width, size.height) },
    },
    blending:   THREE.AdditiveBlending,
    transparent: true,
    depthTest:  false,
    depthWrite: false,
  }), [])

  // ── Nebula materials (5) ─────────────────────────────────────────────────
  const nebulaMats = useMemo(() =>
    NEBULA_CONFIGS.map(cfg => new THREE.ShaderMaterial({
      vertexShader:   nebulaVert,
      fragmentShader: nebulaFrag,
      uniforms: {
        uTime:        { value: 0 },
        uOffset:      { value: new THREE.Vector2(...cfg.offset) },
        uScale:       { value: cfg.scale },
        uColorA:      { value: new THREE.Vector3(...cfg.colorA) },
        uColorB:      { value: new THREE.Vector3(...cfg.colorB) },
        uOpacity:     { value: cfg.opacity },
        uWarp:        { value: cfg.warp },
        uMaskRadius:  { value: cfg.maskRadius },
      },
      blending:    THREE.AdditiveBlending,
      transparent: true,
      depthTest:   false,
      depthWrite:  false,
    })),
  [])

  // ── Dust lane materials (3) ──────────────────────────────────────────────
  const dustMats = useMemo(() =>
    DUST_CONFIGS.map(cfg => new THREE.ShaderMaterial({
      vertexShader:   nebulaVert,
      fragmentShader: nebulaFrag,
      uniforms: {
        uTime:        { value: 0 },
        uOffset:      { value: new THREE.Vector2(...cfg.offset) },
        uScale:       { value: cfg.scale },
        uColorA:      { value: new THREE.Vector3(...cfg.colorA) },
        uColorB:      { value: new THREE.Vector3(...cfg.colorB) },
        uOpacity:     { value: cfg.opacity },
        uWarp:        { value: cfg.warp },
        uMaskRadius:  { value: cfg.maskRadius },
      },
      blending:    THREE.AdditiveBlending,
      transparent: true,
      depthTest:   false,
      depthWrite:  false,
    })),
  [])

  // ── Star field geometries ─────────────────────────────────────────────────
  const starGeoFar  = useMemo(() =>
    makeStarGeometry(55000, [40, 80],   [0.4, 1.0],  FAR_PALETTE,  [-300, -180]), [])
  const starGeoMid  = useMemo(() =>
    makeStarGeometry(16000, [20, 50],   [0.8, 1.6],  MID_PALETTE,  [-180, -100]), [])
  const starGeoNear = useMemo(() =>
    makeStarGeometry(2800,  [10, 30],   [1.2, 2.4],  NEAR_PALETTE, [-100, -60]),  [])

  // ── Star materials ────────────────────────────────────────────────────────
  const makeStarMat = (opacity = 1.0) => new THREE.ShaderMaterial({
    vertexShader:   starVert,
    fragmentShader: starFrag,
    uniforms: {
      uTime:       { value: 0 },
      uPixelRatio: { value: pixelRatio },
    },
    blending:    THREE.AdditiveBlending,
    transparent: true,
    depthTest:   false,
    depthWrite:  false,
  })

  const starMatFar  = useMemo(() => makeStarMat(0.65), [pixelRatio])
  const starMatMid  = useMemo(() => makeStarMat(0.80), [pixelRatio])
  const starMatNear = useMemo(() => makeStarMat(1.00), [pixelRatio])

  // ── Planet materials ──────────────────────────────────────────────────────
  const planetMats = useMemo(() =>
    PLANET_CONFIGS.map(cfg => new THREE.ShaderMaterial({
      vertexShader:   planetVert,
      fragmentShader: planetFrag,
      uniforms: {
        uBaseColor: { value: new THREE.Vector3(...cfg.baseColor) },
        uAtmColor:  { value: new THREE.Vector3(...cfg.atmColor) },
        uSize:      { value: cfg.size },
        uCenter:    { value: new THREE.Vector2(...cfg.center) },
        uLightDir:  { value: cfg.lightDir },
        uOpacity:   { value: cfg.opacity },
        uAspect:    { value: size.width / size.height },
      },
      blending:    THREE.AdditiveBlending,
      transparent: true,
      depthTest:   false,
      depthWrite:  false,
    })),
  [])

  // ── Update uTime every frame ──────────────────────────────────────────────
  useFrame((_, delta) => {
    timeRef.current += delta

    const t = timeRef.current

    voidMat.uniforms.uTime.value  = t
    hazeMat.uniforms.uTime.value  = t
    nebulaMats.forEach(m => { m.uniforms.uTime.value = t })
    dustMats.forEach(m =>   { m.uniforms.uTime.value = t })
    starMatFar.uniforms.uTime.value  = t
    starMatMid.uniforms.uTime.value  = t
    starMatNear.uniforms.uTime.value = t
  })

  // ── Update resolution on resize ───────────────────────────────────────────
  useEffect(() => {
    const res = new THREE.Vector2(size.width, size.height)
    voidMat.uniforms.uRes.value  = res
    hazeMat.uniforms.uRes.value  = res
    const aspect = size.width / size.height
    planetMats.forEach(m => { m.uniforms.uAspect.value = aspect })
  }, [size])

  // ── Geometries ────────────────────────────────────────────────────────────
  // Nebula quads — each is a plane scaled to its config size
  const nebulaGeos = useMemo(() =>
    NEBULA_CONFIGS.map(cfg => new THREE.PlaneGeometry(cfg.size, cfg.size)), [])
  const dustGeos = useMemo(() =>
    DUST_CONFIGS.map(cfg => new THREE.PlaneGeometry(cfg.size, cfg.size)), [])
  const planetGeos = useMemo(() =>
    PLANET_CONFIGS.map(() => new THREE.PlaneGeometry(1, 1)), [])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <group renderOrder={-1000}>

      {/* ── Layer 0: Void base — fullscreen, no depth test ───────────────── */}
      <mesh renderOrder={-100} frustumCulled={false}>
        <planeGeometry args={[200, 120]} />
        <primitive object={voidMat} attach="material" />
      </mesh>

      {/* ── Layer 6: Atmospheric colour gradient ─────────────────────────── */}
      {/* Rendered early so stars and nebulae composite over it */}
      <mesh
        position={[0, 0, -250]}
        renderOrder={-90}
        frustumCulled={false}
      >
        <planeGeometry args={[500, 350]} />
        <primitive object={hazeMat} attach="material" />
      </mesh>

      {/* ── Layer 1: Far stars ────────────────────────────────────────────── */}
      <points geometry={starGeoFar} material={starMatFar} renderOrder={-85} />

      {/* ── Layer 2: Mid stars ───────────────────────────────────────────── */}
      <points geometry={starGeoMid} material={starMatMid} renderOrder={-80} />

      {/* ── Layer 5: Nebulae ─────────────────────────────────────────────── */}
      {NEBULA_CONFIGS.map((cfg, i) => (
        <mesh
          key={`nebula-${i}`}
          position={[
            (Math.random() - 0.5) * 0, // centred — offset handled in shader UV
            (Math.random() - 0.5) * 0,
            cfg.z,
          ]}
          renderOrder={-75 + i}
          frustumCulled={false}
        >
          <primitive object={nebulaGeos[i]} attach="geometry" />
          <primitive object={nebulaMats[i]} attach="material" />
        </mesh>
      ))}

      {/* ── Layer 5b: Dust lanes ─────────────────────────────────────────── */}
      {DUST_CONFIGS.map((cfg, i) => (
        <mesh
          key={`dust-${i}`}
          position={[0, 0, cfg.z]}
          renderOrder={-70 + i}
          frustumCulled={false}
        >
          <primitive object={dustGeos[i]} attach="geometry" />
          <primitive object={dustMats[i]}  attach="material" />
        </mesh>
      ))}

      {/* ── Layer 7: Distant planets ─────────────────────────────────────── */}
      {PLANET_CONFIGS.map((cfg, i) => (
        <mesh
          key={`planet-${i}`}
          position={[0, 0, cfg.z]}
          renderOrder={-60 + i}
          frustumCulled={false}
        >
          <primitive object={planetGeos[i]} attach="geometry" />
          <primitive object={planetMats[i]} attach="material" />
        </mesh>
      ))}

      {/* ── Layer 3: Near/bright accent stars ────────────────────────────── */}
      {/* Rendered on top of nebula so star glints pierce through dust */}
      <points geometry={starGeoNear} material={starMatNear} renderOrder={-55} />

    </group>
  )
}
