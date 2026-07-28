/**
 * Starfield.jsx
 *
 * Three-layer instanced starfield using Points + custom ShaderMaterial.
 *
 * Layer 0 — 35,000 tiny distant stars  (z: -200 to -1200, size: 0.3–0.8)
 * Layer 1 — 8,000  medium stars        (z: -100 to  -500, size: 0.8–2.0)
 * Layer 2 — 400    bright foreground   (z:  -20 to  -180, size: 2.0–5.5)
 *
 * Each star has:
 *   - Random position (large volume)
 *   - Random base size
 *   - Random color temperature (blue-white → warm gold)
 *   - Random twinkle phase + frequency
 *   - Random brightness
 *
 * Performance:
 *   - Single draw call per layer (Points with BufferGeometry)
 *   - All variation encoded in per-vertex attributes
 *   - Shader does twinkling — no JS per-frame per-star work
 *   - Total: ~43,400 points, 3 draw calls
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ------------------------------------------------------------------ */
/*  STAR SHADERS                                                        */
/* ------------------------------------------------------------------ */

const STAR_VERT = /* glsl */`
precision highp float;

attribute float aSize;
attribute vec3  aColor;
attribute float aTwinklePhase;
attribute float aTwinkleFreq;
attribute float aBrightness;

uniform float uTime;
uniform float uPixelRatio;

varying vec3  vColor;
varying float vBrightness;

void main() {
  vColor = aColor;

  /* Subtle brightness oscillation — two sine waves so it's not regular */
  float tw = sin(uTime * aTwinkleFreq + aTwinklePhase)
           * 0.5 + 0.5;
  float tw2 = sin(uTime * aTwinkleFreq * 0.37 + aTwinklePhase * 2.13)
            * 0.5 + 0.5;
  float twinkle = mix(tw, tw2, 0.35);

  /* Twinkle range: 0.75 → 1.0 (very subtle) */
  vBrightness = aBrightness * (0.75 + 0.25 * twinkle);

  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);

  /* Size in pixels — larger for closer (less negative z) stars,
     attenuated with distance to simulate depth-of-field gently */
  float dist = -mvPos.z;
  float attenuated = aSize * (200.0 / max(dist, 1.0));
  attenuated = clamp(attenuated, 0.5, 12.0);

  gl_PointSize = attenuated * uPixelRatio;
  gl_Position  = projectionMatrix * mvPos;
}
`

const STAR_FRAG = /* glsl */`
precision highp float;

varying vec3  vColor;
varying float vBrightness;

void main() {
  /* Circular disc with soft edge — gl_PointCoord is [0,1] across the sprite */
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);

  /* Soft circular alpha — inner circle full, fades to nothing at r=0.5 */
  float alpha = 1.0 - smoothstep(0.18, 0.5, dist);

  /* Core bloom: a tighter, brighter centre point */
  float core = 1.0 - smoothstep(0.0, 0.18, dist);
  alpha = alpha + core * 0.6;
  alpha = clamp(alpha, 0.0, 1.0);

  vec3 col = vColor * vBrightness;

  /* Gamma — additive blend context */
  col = pow(max(col, vec3(0.0)), vec3(1.0 / 2.2));

  gl_FragColor = vec4(col, alpha * vBrightness);
}
`

/* ------------------------------------------------------------------ */
/*  SEEDED PRNG (Mulberry32)                                            */
/* ------------------------------------------------------------------ */

function makePRNG(seed) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1) ^ (s + Math.imul(s ^ (s >>> 7), s | 61))
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ */
/*  COLOR TEMPERATURE TABLE                                             */
/* Roughly maps stellar class to RGB (normalised, not physically exact) */
/* ------------------------------------------------------------------ */

function starColor(rng) {
  const t = rng()
  if (t < 0.08) {
    // O/B class — blue-white
    return new THREE.Color(0.70 + rng() * 0.20, 0.80 + rng() * 0.15, 1.00)
  } else if (t < 0.20) {
    // A class — white-blue
    return new THREE.Color(0.85 + rng() * 0.10, 0.90 + rng() * 0.08, 1.00)
  } else if (t < 0.60) {
    // F/G class — white to warm white
    return new THREE.Color(1.00, 0.96 + rng() * 0.04, 0.88 + rng() * 0.10)
  } else if (t < 0.85) {
    // K class — warm golden-white
    return new THREE.Color(1.00, 0.88 + rng() * 0.08, 0.65 + rng() * 0.15)
  } else {
    // M class / orange — rare but visible
    return new THREE.Color(1.00, 0.65 + rng() * 0.15, 0.30 + rng() * 0.15)
  }
}

/* ------------------------------------------------------------------ */
/*  BUFFER BUILDER                                                      */
/* ------------------------------------------------------------------ */

function buildStarBuffer(count, bounds, sizeRange, brightnessRange, seed) {
  const rng = makePRNG(seed)

  const positions      = new Float32Array(count * 3)
  const sizes          = new Float32Array(count)
  const colors         = new Float32Array(count * 3)
  const twinklePhases  = new Float32Array(count)
  const twinkleFreqs   = new Float32Array(count)
  const brightnesses   = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    positions[i3]     = (rng() - 0.5) * bounds.x
    positions[i3 + 1] = (rng() - 0.5) * bounds.y
    positions[i3 + 2] = -bounds.zNear - rng() * (bounds.zFar - bounds.zNear)

    sizes[i] = sizeRange[0] + rng() * (sizeRange[1] - sizeRange[0])

    const col = starColor(rng)
    colors[i3]     = col.r
    colors[i3 + 1] = col.g
    colors[i3 + 2] = col.b

    twinklePhases[i] = rng() * Math.PI * 2
    twinkleFreqs[i]  = 0.4 + rng() * 1.6   /* 0.4–2.0 Hz */

    brightnesses[i] = brightnessRange[0] + rng() * (brightnessRange[1] - brightnessRange[0])
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position',     new THREE.BufferAttribute(positions,     3))
  geo.setAttribute('aSize',        new THREE.BufferAttribute(sizes,         1))
  geo.setAttribute('aColor',       new THREE.BufferAttribute(colors,        3))
  geo.setAttribute('aTwinklePhase',new THREE.BufferAttribute(twinklePhases, 1))
  geo.setAttribute('aTwinkleFreq', new THREE.BufferAttribute(twinkleFreqs,  1))
  geo.setAttribute('aBrightness',  new THREE.BufferAttribute(brightnesses,  1))
  return geo
}

/* ------------------------------------------------------------------ */
/*  SINGLE STAR LAYER                                                   */
/* ------------------------------------------------------------------ */

function StarLayer({ count, bounds, sizeRange, brightnessRange, seed, clockRef }) {
  const pointsRef = useRef()

  const geometry = useMemo(() =>
    buildStarBuffer(count, bounds, sizeRange, brightnessRange, seed),
  [count, bounds, sizeRange, brightnessRange, seed])

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: {
      uTime:       { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    transparent:  true,
    depthWrite:   false,
    depthTest:    false,
    blending:     THREE.AdditiveBlending,
    vertexColors: true,
  }), [])

  useFrame(() => {
    material.uniforms.uTime.value = clockRef.current
  })

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      renderOrder={-800}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  STARFIELD (all three layers)                                        */
/* ------------------------------------------------------------------ */

export default function Starfield({ clockRef }) {
  return (
    <group>
      {/* Layer 0: Tiny distant stars — very dense */}
      <StarLayer
        count={35000}
        bounds={{ x: 2400, y: 1400, zNear: 200,  zFar: 1200 }}
        sizeRange={[0.3, 0.9]}
        brightnessRange={[0.25, 0.75]}
        seed={0x1a2b3c}
        clockRef={clockRef}
      />

      {/* Layer 1: Medium stars — moderate density */}
      <StarLayer
        count={8000}
        bounds={{ x: 1600, y: 1000, zNear: 100,  zFar: 500 }}
        sizeRange={[0.9, 2.2]}
        brightnessRange={[0.50, 0.90]}
        seed={0x4d5e6f}
        clockRef={clockRef}
      />

      {/* Layer 2: Bright foreground stars — very few, large */}
      <StarLayer
        count={400}
        bounds={{ x: 800,  y: 500,  zNear: 20,   zFar: 180 }}
        sizeRange={[2.2, 5.5]}
        brightnessRange={[0.80, 1.00]}
        seed={0x7a8b9c}
        clockRef={clockRef}
      />
    </group>
  )
}
