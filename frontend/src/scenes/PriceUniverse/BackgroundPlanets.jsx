import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Very dark, glossy, peak-realistic cratered moon ─────────────────────────

const vert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vLocalPos;
  varying float vViewDist;
  varying vec3 vViewDir;

  void main() {
    vLocalPos = position;
    vNormal   = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDist  = -mvPos.z;
    vViewDir   = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`

const frag = /* glsl */ `
  varying vec3  vNormal;
  varying vec3  vLocalPos;
  varying float vViewDist;
  varying vec3  vViewDir;

  uniform float uSeed;
  uniform vec3  uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  float hash(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p.zxy, p.yxz + 19.19);
    return fract(p.x * p.y * p.z);
  }

  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i),             hash(i + vec3(1,0,0)), u.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), u.x), u.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), u.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), u.x), u.y),
      u.z);
  }

  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    mat3 rot = mat3(0.0, 0.8, 0.6, -0.8, 0.36, -0.48, -0.6, -0.48, 0.64);
    for (int i = 0; i < 9; i++) {
      v += a * noise(p);
      p = rot * p * 2.13 + uSeed * 0.33;
      a *= 0.44;
    }
    return v;
  }

  // Peak-realistic crater with sharp raised rim + deep floor
  float crater(vec3 p, vec3 c, float r) {
    float d = distance(normalize(p), normalize(c));
    // sharp raised rim
    float rim = smoothstep(r * 1.02, r * 0.55, d) * smoothstep(r * 0.15, r * 0.48, d);
    // deep flat-ish floor
    float floor = smoothstep(r * 0.48, r * 0.05, d);
    // secondary micro-rim for realism
    float micro = smoothstep(r * 0.38, r * 0.28, d) * smoothstep(r * 0.22, r * 0.32, d);
    return rim * 0.95 - floor * 0.78 + micro * 0.18;
  }

  void main() {
    vec3 p = normalize(vLocalPos);

    // Very rough multi-scale surface (like real regolith)
    float surf = fbm(p * 2.7 + uSeed)
               + fbm(p * 6.8 + uSeed * 1.15) * 0.58
               + fbm(p * 16.5 + uSeed * 1.8) * 0.36
               + fbm(p * 38.0 + uSeed * 2.6) * 0.20
               + fbm(p * 85.0 + uSeed * 3.4) * 0.11
               + fbm(p * 180.0 + uSeed * 4.2) * 0.05;

    // Dense realistic crater field
    float c = 0.0;
    c += crater(p, vec3( 0.62,  0.22,  0.74), 0.32);
    c += crater(p, vec3(-0.68,  0.45,  0.54), 0.24);
    c += crater(p, vec3( 0.06, -0.80,  0.60), 0.28);
    c += crater(p, vec3(-0.26, -0.16,  0.95), 0.15);
    c += crater(p, vec3( 0.80, -0.32,  0.50), 0.19);
    c += crater(p, vec3(-0.20,  0.88, -0.46), 0.13);
    c += crater(p, vec3( 0.46,  0.56, -0.70), 0.17);
    c += crater(p, vec3(-0.78, -0.42,  0.44), 0.12);
    c += crater(p, vec3( 0.18, -0.60, -0.76), 0.14);
    c += crater(p, vec3(-0.52,  0.10, -0.84), 0.11);
    c += crater(p, vec3( 0.72,  0.38,  0.56), 0.10);
    c += crater(p, vec3(-0.00,  0.68,  0.73), 0.16);
    c += crater(p, vec3( 0.38, -0.72,  0.60), 0.09);
    c += crater(p, vec3(-0.86,  0.24,  0.44), 0.13);
    c += crater(p, vec3( 0.10,  0.34, -0.93), 0.18);
    c += crater(p, vec3(-0.40, -0.64,  0.66), 0.08);
    c += crater(p, vec3( 0.58, -0.12, -0.80), 0.12);
    c += crater(p, vec3(-0.14,  0.52, -0.84), 0.07);
    c += crater(p, vec3( 0.30,  0.78,  0.55), 0.11);
    c += crater(p, vec3(-0.60, -0.28, -0.75), 0.09);

    // Extremely dark base
    float warmBias = fbm(p * 1.5 + uSeed * 0.28);
    vec3 baseCol = mix(
      vec3(0.06, 0.07, 0.10),   // almost black
      vec3(0.11, 0.09, 0.08),   // tiny warm variation
      warmBias * 0.35
    );

    float albedo = clamp(surf * 0.62 + 0.04 + c, 0.0, 1.0);
    vec3  surfCol = baseCol * albedo;

    vec3 N = normalize(vNormal);

    // Soft ambient (very dark)
    vec3 ambLight = vec3(0.025, 0.028, 0.035);

    // Galaxy rim lights (subtle because moons are dark)
    vec3  jumiaDir = normalize(vec3(-0.58, -0.12, 0.80));
    float jumiaRim = pow(max(0.0, 1.0 - dot(N, jumiaDir)), 4.2);
    vec3  jumiaCol = vec3(0.55, 0.25, 0.05) * jumiaRim * 0.22;

    vec3  jijiDir  = normalize(vec3(0.70, 0.08, 0.70));
    float jijiRim  = pow(max(0.0, 1.0 - dot(N, jijiDir)), 4.2);
    vec3  jijiCol  = vec3(0.04, 0.32, 0.38) * jijiRim * 0.18;

    // Key light
    vec3 L = normalize(vec3(0.20, 0.82, 0.50));
    float diff = max(dot(N, L), 0.0);
    float diffuse = diff * 0.55 + 0.04;

    // Glossy specular (key for the "glossy-ish" look)
    vec3 H = normalize(L + vViewDir);
    float spec = pow(max(dot(N, H), 0.0), 48.0) * 0.35;
    // secondary softer gloss
    float softSpec = pow(max(dot(N, H), 0.0), 12.0) * 0.12;

    vec3 col = surfCol * (ambLight * 7.5 + diffuse * 3.8) + jumiaCol + jijiCol;
    col += vec3(0.55, 0.58, 0.65) * (spec + softSpec);   // cool glossy highlight
    col = clamp(col, 0.0, 0.55);   // keep overall very dark

    float fogT = smoothstep(uFogNear, uFogFar, vViewDist);
    col = mix(col, uFogColor, fogT * 0.78);

    gl_FragColor = vec4(col, 1.0);
  }
`

// ─── Soft dust halo ──────────────────────────────────────────────────────────

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
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2(1,0)), u.x),
               mix(hash2(i + vec2(0,1)), hash2(i + vec2(1,1)), u.x), u.y);
  }
  float fbm2(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise2(p);
      p = p * 2.15 + 3.7;
      a *= 0.48;
    }
    return v;
  }

  void main() {
    vec2  uv     = vUv - 0.5;
    float d      = length(uv);
    float radial = smoothstep(0.52, 0.03, d);
    float dust   = fbm2(vUv * 4.5) * 0.7 + 0.3;
    float alpha  = radial * dust * uOpacity;
    gl_FragColor = vec4(uColor * 0.7, alpha);
  }
`

// ─── Very subtle atmospheric rim ─────────────────────────────────────────────

const rimFrag = /* glsl */ `
  varying vec3  vNormal;
  uniform vec3  uGlowColor;
  uniform float uOpacity;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 3.8);
    gl_FragColor = vec4(uGlowColor * rim, rim * uOpacity);
  }
`

// ─── Moon component ──────────────────────────────────────────────────────────

function Moon({ position, scale, seed, rotSpeed, glowColor, glowOpacity, dustColor, dustOpacity, fogColor }) {
  const meshRef = useRef()

  const bodyUniforms = useMemo(() => ({
    uSeed:     { value: seed },
    uFogColor: { value: new THREE.Color(fogColor) },
    uFogNear:  { value: 140 },
    uFogFar:   { value: 420 },
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

  const haloSize = scale * 5.6

  return (
    <group position={position}>
      <mesh position={[0, 0, -scale * 0.35]} renderOrder={-1}>
        <planeGeometry args={[haloSize * 2.0, haloSize * 2.0]} />
        <shaderMaterial
          vertexShader={haloVert}
          fragmentShader={haloFrag}
          uniforms={dustUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>

      <mesh ref={meshRef} scale={scale}>
        <sphereGeometry args={[1, 192, 192]} />
        <shaderMaterial vertexShader={vert} fragmentShader={frag} uniforms={bodyUniforms} />
      </mesh>

      <mesh scale={scale * 1.08}>
        <sphereGeometry args={[1, 40, 40]} />
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

// ─── Sparse edge planets (match intended mock density) ───────────────────────

function BackgroundPlanets() {
  const FOG = '#000008'

  const moons = useMemo(() => [
    // Large framing moons — edges only, softer glow
    { id: 'L1', position: [-195,  18, -210], scale: 22.0, seed: 1.12, rotSpeed: 0.007, glowColor: '#10162a', glowOpacity: 0.03, dustColor: '#060a14', dustOpacity: 0.06, fogColor: FOG },
    { id: 'R1', position: [248,  58, -185], scale: 17.0, seed: 7.88, rotSpeed: 0.010, glowColor: '#0a1822', glowOpacity: 0.03, dustColor: '#050e14', dustOpacity: 0.08, fogColor: FOG },
    { id: 'R2', position: [228, -105, -170], scale: 12.0, seed: 3.41, rotSpeed: 0.015, glowColor: '#160c08', glowOpacity: 0.025, dustColor: '#0c0604', dustOpacity: 0.07, fogColor: FOG },
    // Mid-depth accents
    { id: 'M1', position: [-155, -70, -220], scale: 10.5, seed: 5.67, rotSpeed: 0.018, glowColor: '#0e1428', glowOpacity: 0.025, dustColor: '#060a16', dustOpacity: 0.06, fogColor: FOG },
    { id: 'M2', position: [155,  95, -205], scale: 9.0,  seed: 9.23, rotSpeed: 0.020, glowColor: '#0a1822', glowOpacity: 0.025, dustColor: '#061018', dustOpacity: 0.08, fogColor: FOG },
    // Deep background anchors
    { id: 'T1', position: [55,  130, -310], scale: 11.0, seed: 3.33, rotSpeed: 0.006, glowColor: '#080e18', glowOpacity: 0.015, dustColor: '#040810', dustOpacity: 0.04, fogColor: FOG },
    { id: 'T2', position: [-130, -35, -320], scale: 13.0, seed: 7.14, rotSpeed: 0.005, glowColor: '#0a0e16', glowOpacity: 0.015, dustColor: '#05070c', dustOpacity: 0.04, fogColor: FOG },
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