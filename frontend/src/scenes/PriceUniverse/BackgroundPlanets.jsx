import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Realistic background: real-looking planets (Earth, Mars, gas giant, icy)
 * + rocky asteroids with organic displacement (not geometric icosahedrons).
 */

// ─── Shared GLSL noise ───────────────────────────────────────────────────────

const noiseGLSL = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p.zxy, p.yxz + 19.19);
    return fract(p.x * p.y * p.z);
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i+vec3(1,0,0)), u.x),
          mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), u.x), u.y),
      mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), u.x),
          mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), u.x), u.y),
      u.z);
  }
  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p = p * 2.05 + 3.1;
      a *= 0.5;
    }
    return v;
  }
`

// ─── Realistic asteroid (organic rock, not polyhedron) ───────────────────────

const asteroidVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vWorldNormal;
  uniform float uSeed;
  ${noiseGLSL}
  void main() {
    vec3 n = normalize(position);
    // Organic rocky displacement — irregular but smooth enough to look real
    float d = 0.0;
    d += (fbm(n * 2.5 + uSeed) - 0.5) * 0.28;
    d += (fbm(n * 6.0 + uSeed * 1.3) - 0.5) * 0.14;
    d += (fbm(n * 14.0 + uSeed * 2.1) - 0.5) * 0.06;
    // Occasional deeper craters / gashes
    float crater = smoothstep(0.62, 0.75, fbm(n * 3.5 + uSeed * 4.0));
    d -= crater * 0.12;
    vec3 displaced = n * (1.0 + d);
    vPos = displaced;
    vNormal = normalize(normalMatrix * n);
    vWorldNormal = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

const asteroidFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vWorldNormal;
  uniform float uSeed;
  uniform vec3 uBaseColor;
  ${noiseGLSL}
  void main() {
    vec3 n = normalize(vPos);
    float surf = fbm(n * 4.0 + uSeed)
               + fbm(n * 12.0 + uSeed * 1.5) * 0.45
               + fbm(n * 28.0 + uSeed * 2.2) * 0.22;
    // Dark rock with dusty highlights
    vec3 dark = uBaseColor * 0.45;
    vec3 mid  = uBaseColor * 0.85;
    vec3 light = mix(uBaseColor, vec3(0.55, 0.5, 0.42), 0.25);
    vec3 col = mix(dark, mid, smoothstep(0.25, 0.55, surf));
    col = mix(col, light, smoothstep(0.6, 0.85, surf) * 0.5);

    // Simple lighting
    vec3 L = normalize(vec3(0.4, 0.7, 0.35));
    float diff = max(dot(normalize(vNormal), L), 0.0);
    float amb = 0.18;
    col *= amb + diff * 0.9;

    // Subtle rim
    float rim = pow(1.0 - max(dot(normalize(vNormal), vec3(0,0,1)), 0.0), 2.5);
    col += vec3(0.08, 0.07, 0.06) * rim * 0.4;

    gl_FragColor = vec4(col, 1.0);
  }
`

function Asteroid({ position, scale = 1, seed = 1, tumble = [0.1, 0.12, 0.08], drift = [1.5, 1.2, 0.8], color = '#6a6055' }) {
  const ref = useRef()
  const uniforms = useMemo(
    () => ({
      uSeed: { value: seed },
      uBaseColor: { value: new THREE.Color(color) },
    }),
    [seed, color],
  )
  const base = useMemo(() => new THREE.Vector3(...position), [position])
  const phase = seed * 1.7

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.rotation.x = t * tumble[0] + phase
    ref.current.rotation.y = t * tumble[1] + phase * 0.6
    ref.current.rotation.z = t * tumble[2] + phase * 0.3
    ref.current.position.x = base.x + Math.sin(t * 0.06 + phase) * drift[0]
    ref.current.position.y = base.y + Math.cos(t * 0.045 + phase * 1.2) * drift[1]
    ref.current.position.z = base.z + Math.sin(t * 0.035 + phase * 0.4) * drift[2]
  })

  return (
    <mesh ref={ref} scale={scale}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial vertexShader={asteroidVert} fragmentShader={asteroidFrag} uniforms={uniforms} />
    </mesh>
  )
}

// ─── Planet shaders ──────────────────────────────────────────────────────────

const planetVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Earth-like
const earthFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec2 vUv;
  ${noiseGLSL}
  void main() {
    vec3 n = normalize(vPos);
    float land = fbm(n * 3.5);
    float cloud = fbm(n * 5.0 + 10.0);
    vec3 ocean = vec3(0.05, 0.15, 0.35);
    vec3 grass = vec3(0.12, 0.32, 0.12);
    vec3 desert = vec3(0.45, 0.38, 0.22);
    vec3 ice = vec3(0.85, 0.9, 0.95);
    float lat = abs(n.y);
    vec3 terrain = mix(ocean, grass, smoothstep(0.42, 0.55, land));
    terrain = mix(terrain, desert, smoothstep(0.58, 0.72, land) * (1.0 - lat));
    terrain = mix(terrain, ice, smoothstep(0.7, 0.88, lat));
    vec3 col = mix(terrain, vec3(1.0), smoothstep(0.55, 0.75, cloud) * 0.45);
    vec3 L = normalize(vec3(0.3, 0.6, 0.5));
    float diff = max(dot(normalize(vNormal), L), 0.0);
    col *= 0.2 + diff * 0.9;
    // atmosphere rim
    float rim = pow(1.0 - max(dot(normalize(vNormal), vec3(0,0,1)), 0.0), 3.0);
    col += vec3(0.3, 0.5, 0.9) * rim * 0.35;
    gl_FragColor = vec4(col, 1.0);
  }
`

// Mars-like
const marsFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  ${noiseGLSL}
  void main() {
    vec3 n = normalize(vPos);
    float s = fbm(n * 4.0) + fbm(n * 10.0) * 0.4;
    vec3 dark = vec3(0.25, 0.1, 0.05);
    vec3 mid = vec3(0.55, 0.28, 0.12);
    vec3 light = vec3(0.7, 0.45, 0.25);
    vec3 col = mix(dark, mid, smoothstep(0.3, 0.55, s));
    col = mix(col, light, smoothstep(0.6, 0.85, s));
    // polar ice
    col = mix(col, vec3(0.85, 0.88, 0.9), smoothstep(0.75, 0.92, abs(n.y)));
    vec3 L = normalize(vec3(0.3, 0.7, 0.4));
    float diff = max(dot(normalize(vNormal), L), 0.0);
    col *= 0.18 + diff * 0.95;
    gl_FragColor = vec4(col, 1.0);
  }
`

// Gas giant (Jupiter-ish)
const gasFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  ${noiseGLSL}
  void main() {
    vec3 n = normalize(vPos);
    float bands = sin(n.y * 12.0 + fbm(n * 3.0) * 2.0) * 0.5 + 0.5;
    vec3 c1 = vec3(0.7, 0.55, 0.35);
    vec3 c2 = vec3(0.45, 0.32, 0.22);
    vec3 c3 = vec3(0.85, 0.75, 0.6);
    vec3 col = mix(c2, c1, bands);
    col = mix(col, c3, smoothstep(0.6, 0.9, bands) * 0.4);
    // storm swirl
    float storm = smoothstep(0.55, 0.7, fbm(n * 5.0 + vec3(2.0, 0.0, 0.0)));
    col = mix(col, vec3(0.6, 0.25, 0.15), storm * 0.5);
    vec3 L = normalize(vec3(0.35, 0.6, 0.45));
    float diff = max(dot(normalize(vNormal), L), 0.0);
    col *= 0.22 + diff * 0.85;
    gl_FragColor = vec4(col, 1.0);
  }
`

// Icy / grey moon planet
const icyFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  ${noiseGLSL}
  void main() {
    vec3 n = normalize(vPos);
    float s = fbm(n * 3.5) + fbm(n * 9.0) * 0.4;
    vec3 dark = vec3(0.15, 0.16, 0.2);
    vec3 mid = vec3(0.35, 0.38, 0.42);
    vec3 ice = vec3(0.7, 0.75, 0.82);
    vec3 col = mix(dark, mid, smoothstep(0.3, 0.55, s));
    col = mix(col, ice, smoothstep(0.6, 0.85, s) * 0.6);
    vec3 L = normalize(vec3(0.3, 0.65, 0.4));
    float diff = max(dot(normalize(vNormal), L), 0.0);
    col *= 0.2 + diff * 0.9;
    float rim = pow(1.0 - max(dot(normalize(vNormal), vec3(0,0,1)), 0.0), 2.8);
    col += vec3(0.15, 0.18, 0.25) * rim * 0.3;
    gl_FragColor = vec4(col, 1.0);
  }
`

const PLANET_SHADERS = {
  earth: earthFrag,
  mars: marsFrag,
  gas: gasFrag,
  icy: icyFrag,
}

function Planet({ position, scale, type = 'earth', rotSpeed = 0.01 }) {
  const ref = useRef()
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += rotSpeed * dt
  })
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial vertexShader={planetVert} fragmentShader={PLANET_SHADERS[type] || earthFrag} />
    </mesh>
  )
}

// ─── Scene composition ───────────────────────────────────────────────────────

export default function BackgroundPlanets() {
  const asteroids = useMemo(
    () => [
      { id: 'a1', position: [-50, 30, 45], scale: 4.5, seed: 1.1, color: '#6a6055', tumble: [0.1, 0.14, 0.08], drift: [2, 1.5, 1] },
      { id: 'a2', position: [60, -35, 40], scale: 3.5, seed: 2.3, color: '#5c554c', tumble: [0.12, 0.09, 0.11], drift: [1.5, 2, 0.8] },
      { id: 'a3', position: [35, 42, 30], scale: 2.4, seed: 3.7, color: '#7a7060', tumble: [0.18, 0.12, 0.09], drift: [1.2, 1.6, 0.9] },
      { id: 'a4', position: [-70, -18, 55], scale: 5.5, seed: 4.2, color: '#4a4540', tumble: [0.07, 0.1, 0.12], drift: [2.2, 1.2, 1.4] },
      { id: 'a5', position: [85, 12, 25], scale: 2.2, seed: 5.5, color: '#6e6558', tumble: [0.15, 0.2, 0.1], drift: [1, 1.4, 0.6] },
      { id: 'a6', position: [-30, 48, 35], scale: 1.8, seed: 6.1, color: '#55504a', tumble: [0.22, 0.14, 0.18], drift: [1.3, 1, 0.7] },
      { id: 'a7', position: [45, -48, 50], scale: 3.0, seed: 7.8, color: '#6a6258', tumble: [0.09, 0.16, 0.11], drift: [1.8, 1.6, 1] },
      { id: 'a8', position: [-90, 8, 20], scale: 4.0, seed: 8.4, color: '#5a544c', tumble: [0.08, 0.1, 0.06], drift: [1.6, 1.2, 1.1] },
      { id: 'b1', position: [125, 50, -45], scale: 5.5, seed: 9.2, color: '#4e4842', tumble: [0.05, 0.08, 0.04], drift: [2.5, 1.8, 1.2] },
      { id: 'b2', position: [-115, -55, -35], scale: 4.5, seed: 10.5, color: '#6a6055', tumble: [0.07, 0.09, 0.06], drift: [2, 1.8, 1] },
      { id: 'b3', position: [100, -75, -25], scale: 3.2, seed: 11.3, color: '#7a7060', tumble: [0.1, 0.07, 0.09], drift: [1.8, 1.4, 0.9] },
      { id: 'b4', position: [-95, 65, -55], scale: 2.8, seed: 12.7, color: '#55504a', tumble: [0.12, 0.14, 0.08], drift: [1.5, 2, 0.7] },
      { id: 'c1', position: [22, 22, 60], scale: 1.2, seed: 13.1, color: '#6e6558', tumble: [0.25, 0.2, 0.18], drift: [0.9, 1.1, 0.4] },
      { id: 'c2', position: [-40, -42, 45], scale: 1.5, seed: 14.6, color: '#4a4540', tumble: [0.2, 0.24, 0.14], drift: [1.1, 0.9, 0.5] },
      { id: 'c3', position: [72, 2, 55], scale: 1.0, seed: 15.2, color: '#6a6055', tumble: [0.3, 0.18, 0.22], drift: [0.7, 1.2, 0.4] },
      { id: 'd1', position: [185, -45, -130], scale: 7.5, seed: 16.8, color: '#4e4842', tumble: [0.03, 0.04, 0.03], drift: [3.5, 2, 1.8] },
      { id: 'd2', position: [-170, 55, -145], scale: 6.5, seed: 17.4, color: '#5c554c', tumble: [0.035, 0.03, 0.04], drift: [3, 2.2, 1.4] },
    ],
    [],
  )

  return (
    <group>
      {/* Real-looking planets */}
      <Planet position={[210, 70, -190]} scale={16} type="earth" rotSpeed={0.008} />
      <Planet position={[-185, -55, -200]} scale={13} type="mars" rotSpeed={0.012} />
      <Planet position={[155, -110, -175]} scale={11} type="gas" rotSpeed={0.015} />
      <Planet position={[-140, 95, -220]} scale={9} type="icy" rotSpeed={0.006} />

      {/* Realistic rocky asteroids floating around */}
      {asteroids.map((a) => (
        <Asteroid key={a.id} {...a} />
      ))}
    </group>
  )
}
