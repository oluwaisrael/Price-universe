import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Planet body shader ───────────────────────────────────────────────────────

const vert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vLocalPos;
  varying float vViewDist;

  void main() {
    vLocalPos = position;
    vNormal   = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDist  = -mvPos.z;           // depth in view space (positive = away)
    gl_Position = projectionMatrix * mvPos;
  }
`

const frag = /* glsl */ `
  varying vec3  vNormal;
  varying vec3  vLocalPos;
  varying float vViewDist;

  uniform float uSeed;
  uniform vec3  uFogColor;   // scene background colour to fade into
  uniform float uFogNear;    // view-space depth where fog starts
  uniform float uFogFar;     // view-space depth where fully fogged

  // ── noise ──────────────────────────────────────────────────────────
  float hash(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p.zxy, p.yxz + 19.19);
    return fract(p.x * p.y * p.z);
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f*f*(3.0-2.0*f);
    return mix(
      mix(mix(hash(i),             hash(i+vec3(1,0,0)),u.x),
          mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)),u.x),u.y),
      mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)),u.x),
          mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)),u.x),u.y),
      u.z);
  }
  float fbm(vec3 p) {
    float v=0.0, a=0.5;
    mat3 rot=mat3(0.0,0.8,0.6,-0.8,0.36,-0.48,-0.6,-0.48,0.64);
    for(int i=0;i<6;i++){ v+=a*noise(p); p=rot*p*2.03+uSeed*0.31; a*=0.48; }
    return v;
  }

  // sharp crater: raised rim + sunken floor
  float crater(vec3 p, vec3 c, float r) {
    float d   = distance(normalize(p), normalize(c));
    float rim = smoothstep(r, r*0.72, d) * smoothstep(r*0.35, r*0.62, d);
    float fl  = smoothstep(r*0.62, r*0.30, d);
    return rim*0.22 - fl*0.10;
  }

  void main() {
    vec3 p = normalize(vLocalPos);

    // ── surface ─────────────────────────────────────────────────────
    float surf = fbm(p*3.5+uSeed)
               + fbm(p*9.0+uSeed*1.4)*0.40
               + fbm(p*22.0+uSeed*2.1)*0.18;

    float c = 0.0;
    c += crater(p, vec3( 0.52+uSeed*0.01,  0.31, 0.80), 0.24);
    c += crater(p, vec3(-0.63,  0.48+uSeed*0.02, 0.59), 0.16);
    c += crater(p, vec3( 0.10, -0.72,  0.69-uSeed*0.01), 0.20);
    c += crater(p, vec3(-0.28, -0.18,  0.94), 0.10);
    c += crater(p, vec3( 0.71, -0.41,  0.57+uSeed*0.02), 0.13);
    c += crater(p, vec3(-0.10,  0.82, -0.56), 0.09);

    float warmBias = fbm(p*2.0+uSeed*0.5);
    vec3  baseCol  = mix(vec3(0.15,0.16,0.20), vec3(0.22,0.19,0.16), warmBias);
    float albedo   = clamp(surf*0.32+0.08+c, 0.0, 1.0);
    vec3  surfCol  = baseCol * albedo;

    // ── lighting ────────────────────────────────────────────────────
    vec3 N = normalize(vNormal);

    vec3  ambLight = vec3(0.10, 0.10, 0.13);

    // Jumia orange rim
    vec3  jumiaDir = normalize(vec3(-0.55,-0.25,0.80));
    float jumiaRim = pow(max(0.0,1.0-dot(N,jumiaDir)),3.5);
    vec3  jumiaCol = vec3(0.55,0.28,0.04)*jumiaRim*0.28;

    // Jiji cyan rim
    vec3  jijiDir  = normalize(vec3(0.70,0.10,0.72));
    float jijiRim  = pow(max(0.0,1.0-dot(N,jijiDir)),3.5);
    vec3  jijiCol  = vec3(0.04,0.38,0.42)*jijiRim*0.22;

    // main fill
    float diff    = max(dot(N, normalize(vec3(0.30,0.80,0.50))), 0.0);
    float diffuse = diff*0.55+0.08;

    vec3 col = surfCol*(ambLight*6.0+diffuse*3.5) + jumiaCol + jijiCol;
    col = clamp(col, 0.0, 0.55);

    // ── atmospheric depth fog ────────────────────────────────────────
    // Blends planet into the background colour with distance so the
    // silhouette softens and the body reads as far away, not pasted-on.
    float fogT = smoothstep(uFogNear, uFogFar, vViewDist);
    col = mix(col, uFogColor, fogT * 0.72);   // 0.72 → doesn't fully vanish

    gl_FragColor = vec4(col, 1.0);
  }
`

// ─── Dust halo shader (large soft billboard disc behind planet) ──────────────
// Gives the impression of local nebula/dust density variation around the body.

const haloVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const haloFrag = /* glsl */ `
  varying vec2 vUv;
  uniform vec3  uColor;
  uniform float uOpacity;

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise2(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash2(i),hash2(i+vec2(1,0)),u.x),
               mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),u.x),u.y);
  }
  float fbm2(vec2 p) {
    float v=0.0,a=0.5;
    for(int i=0;i<4;i++){ v+=a*noise2(p); p=p*2.1+3.7; a*=0.5; }
    return v;
  }

  void main() {
    vec2  uv  = vUv - 0.5;             // centre at 0
    float d   = length(uv);

    // soft radial falloff — wide, very gentle
    float radial = smoothstep(0.5, 0.05, d);

    // patchy FBM mask so it's not a perfect circle
    float dust = fbm2(vUv * 3.5) * 0.7 + 0.3;

    float alpha = radial * dust * uOpacity;
    gl_FragColor = vec4(uColor * 0.9, alpha);
  }
`

// ─── Atmospheric rim (back-face shell) ───────────────────────────────────────

const rimFrag = /* glsl */ `
  varying vec3  vNormal;
  uniform vec3  uGlowColor;
  uniform float uOpacity;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), vec3(0,0,1))), 3.2);
    gl_FragColor = vec4(uGlowColor * rim, rim * uOpacity);
  }
`

// ─── Moon component ───────────────────────────────────────────────────────────

function Moon({ position, scale, seed, rotSpeed, glowColor, glowOpacity, dustColor, dustOpacity, fogColor }) {
  const meshRef = useRef()

  // fog depth is in view space; planets are ~160-180 units from camera origin
  // (camera at z=88, planet at z=-180 → depth ≈ 268). Tune near/far around that.
  const bodyUniforms = useMemo(() => ({
    uSeed:    { value: seed },
    uFogColor:{ value: new THREE.Color(fogColor) },
    uFogNear: { value: 180 },
    uFogFar:  { value: 320 },
  }), [seed, fogColor])

  const rimUniforms = useMemo(() => ({
    uGlowColor: { value: new THREE.Color(glowColor) },
    uOpacity:   { value: glowOpacity },
  }), [glowColor, glowOpacity])

  const dustUniforms = useMemo(() => ({
    uColor:   { value: new THREE.Color(dustColor) },
    uOpacity: { value: dustOpacity },
  }), [dustColor, dustOpacity])

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += rotSpeed * delta
  })

  const haloSize = scale * 5.5  // dust halo is much wider than the sphere

  return (
    <group position={position}>
      {/* dust/nebula halo — large soft disc behind the planet */}
      <mesh position={[0, 0, -scale * 0.5]} renderOrder={-1}>
        <planeGeometry args={[haloSize * 2, haloSize * 2]} />
        <shaderMaterial
          vertexShader={haloVert}
          fragmentShader={haloFrag}
          uniforms={dustUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* planet body */}
      <mesh ref={meshRef} scale={scale}>
        <sphereGeometry args={[1, 128, 128]} />
        <shaderMaterial vertexShader={vert} fragmentShader={frag} uniforms={bodyUniforms} />
      </mesh>

      {/* thin atmospheric rim */}
      <mesh scale={scale * 1.07}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          vertexShader={vert}
          fragmentShader={rimFrag}
          uniforms={rimUniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

// ─── Scene ───────────────────────────────────────────────────────────────────

function BackgroundPlanets() {
  // Scene bg colour — match Canvas background (#000008)
  const FOG = '#000008'

  const moons = useMemo(() => [
    {
      // Upper-right — push further right so it clips at edge, above Jiji
      id: 'upper-right',
      position: [145, 38, -180],
      scale: 10,
      seed: 7.13,
      rotSpeed: 0.025,
      glowColor:   '#0d3d4a',
      glowOpacity: 0.20,
      dustColor:   '#0a2535',
      dustOpacity: 0.22,
      fogColor:    FOG,
    },
    {
      // Lower-right — small, bottom-right, more off-screen
      id: 'lower-right',
      position: [120, -55, -160],
      scale: 6,
      seed: 3.71,
      rotSpeed: 0.038,
      glowColor:   '#2a1405',
      glowOpacity: 0.18,
      dustColor:   '#1a0d04',
      dustOpacity: 0.18,
      fogColor:    FOG,
    },
    {
      // Left accent — push fully off left edge, only a sliver visible
      id: 'left-accent',
      position: [-75, 5, -180],
      scale: 5,
      seed: 1.99,
      rotSpeed: 0.045,
      glowColor:   '#0a0a18',
      glowOpacity: 0.12,
      dustColor:   '#08080f',
      dustOpacity: 0.10,
      fogColor:    FOG,
    },
  ], [])

  return (
    <group>
      {moons.map((m) => (
        <Moon key={m.id} {...m} />
      ))}
    </group>
  )
}

export default BackgroundPlanets