import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Cinematic futuristic planets (premium sci-fi look)
 * + near-black matte asteroids.
 */

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

// ─── Near-black matte asteroid ───────────────────────────────────────────────

const asteroidVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  uniform float uSeed;
  ${noiseGLSL}
  void main() {
    vec3 n = normalize(position);
    float d = 0.0;
    d += (fbm(n * 2.2 + uSeed) - 0.5) * 0.42;
    d += (fbm(n * 5.5 + uSeed * 1.3) - 0.5) * 0.22;
    d += (fbm(n * 12.0 + uSeed * 2.1) - 0.5) * 0.1;
    d += (fbm(n * 28.0 + uSeed * 3.0) - 0.5) * 0.04;
    // Multiple crater scales
    float crater = smoothstep(0.55, 0.78, fbm(n * 3.2 + uSeed * 4.0));
    d -= crater * 0.18;
    float micro = smoothstep(0.62, 0.8, fbm(n * 9.0 + uSeed * 7.0));
    d -= micro * 0.06;
    vec3 displaced = n * (1.0 + d);
    vPos = displaced;
    vNormal = normalize(normalMatrix * n);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

const asteroidFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  uniform float uSeed;
  ${noiseGLSL}
  void main() {
    vec3 n = normalize(vPos);
    float surf = fbm(n * 4.0 + uSeed)
               + fbm(n * 12.0 + uSeed * 1.5) * 0.4
               + fbm(n * 28.0 + uSeed * 2.2) * 0.2;
    vec3 dark  = vec3(0.025, 0.024, 0.028);
    vec3 mid   = vec3(0.055, 0.05, 0.048);
    vec3 light = vec3(0.1, 0.09, 0.085);
    vec3 col = mix(dark, mid, smoothstep(0.25, 0.55, surf));
    col = mix(col, light, smoothstep(0.6, 0.9, surf) * 0.28);
    float pit = smoothstep(0.35, 0.12, surf);
    col *= 1.0 - pit * 0.5;
    vec3 L = normalize(vec3(0.4, 0.7, 0.35));
    float diff = max(dot(normalize(vNormal), L), 0.0);
    col *= 0.25 + diff * 0.48;
    float rim = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 3.2);
    col += vec3(0.02, 0.02, 0.025) * rim * 0.35;
    gl_FragColor = vec4(clamp(col, 0.0, 0.14), 1.0);
  }
`

function Asteroid({ position, scale = 1, seed = 1, tumble = [0.1, 0.12, 0.08], drift = [1.5, 1.2, 0.8] }) {
  const ref = useRef()
  const uniforms = useMemo(() => ({ uSeed: { value: seed } }), [seed])
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

// ─── Cinematic planet body ───────────────────────────────────────────────────

const planetVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vViewDir;
  varying vec3 vWorldNormal;
  void main() {
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

// Futuristic Earth — dramatic terminator, rich atmosphere, premium surface
const earthFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vViewDir;
  ${noiseGLSL}
  void main() {
    vec3 n = normalize(vPos);
    vec3 N = normalize(vNormal);
    float land = fbm(n * 4.0) + fbm(n * 10.0) * 0.4 + fbm(n * 22.0) * 0.15;
    float cloud = fbm(n * 5.0 + 8.0) + fbm(n * 13.0 + 3.0) * 0.35;
    float city = fbm(n * 18.0 + 20.0);
    float lat = abs(n.y);

    // Rich surface palette
    vec3 deepOcean = vec3(0.01, 0.04, 0.14);
    vec3 ocean     = vec3(0.02, 0.12, 0.32);
    vec3 coastal   = vec3(0.04, 0.22, 0.38);
    vec3 landDark  = vec3(0.04, 0.1, 0.05);
    vec3 landMid   = vec3(0.12, 0.28, 0.1);
    vec3 desert    = vec3(0.42, 0.32, 0.16);
    vec3 snow      = vec3(0.85, 0.9, 0.95);

    vec3 col = mix(deepOcean, ocean, smoothstep(0.3, 0.45, land));
    col = mix(col, coastal, smoothstep(0.45, 0.52, land));
    col = mix(col, landDark, smoothstep(0.5, 0.58, land));
    col = mix(col, landMid, smoothstep(0.55, 0.68, land));
    col = mix(col, desert, smoothstep(0.68, 0.82, land) * (1.0 - lat * 0.8));
    col = mix(col, snow, smoothstep(0.7, 0.9, lat));

    // Clouds with soft volume
    float cloudMask = smoothstep(0.48, 0.7, cloud);
    col = mix(col, vec3(0.9, 0.94, 1.0), cloudMask * 0.5);

    // Key light — strong cinematic side light
    vec3 L = normalize(vec3(0.55, 0.35, 0.6));
    float NdotL = dot(N, L);
    float day = smoothstep(-0.05, 0.25, NdotL);
    float night = 1.0 - day;

    // Day side
    vec3 dayCol = col * (0.15 + max(NdotL, 0.0) * 1.1);

    // Night side — city lights on land
    float isLand = smoothstep(0.48, 0.55, land);
    float lights = smoothstep(0.55, 0.75, city) * isLand * night;
    vec3 nightCol = col * 0.04 + vec3(0.9, 0.7, 0.35) * lights * 0.55;

    col = mix(nightCol, dayCol, day);

    // Specular ocean glint
    vec3 H = normalize(L + vViewDir);
    float spec = pow(max(dot(N, H), 0.0), 48.0) * (1.0 - smoothstep(0.45, 0.55, land));
    col += vec3(0.6, 0.75, 1.0) * spec * 0.35 * day;

    // Strong atmospheric rim (sci-fi premium)
    float fresnel = pow(1.0 - max(dot(N, vViewDir), 0.0), 2.4);
    col += vec3(0.15, 0.45, 1.0) * fresnel * 0.7;
    col += vec3(0.35, 0.65, 1.0) * pow(fresnel, 3.5) * 0.4;
    // Thin bright limb
    col += vec3(0.6, 0.85, 1.0) * pow(fresnel, 8.0) * 0.35;

    gl_FragColor = vec4(col, 1.0);
  }
`

// Alien / terraformed world — cinematic teal-gold
const alienFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vViewDir;
  ${noiseGLSL}
  void main() {
    vec3 n = normalize(vPos);
    vec3 N = normalize(vNormal);
    float s = fbm(n * 3.5) + fbm(n * 9.0) * 0.4 + fbm(n * 20.0) * 0.15;

    vec3 deep = vec3(0.02, 0.06, 0.1);
    vec3 mid  = vec3(0.08, 0.2, 0.22);
    vec3 land = vec3(0.25, 0.28, 0.18);
    vec3 high = vec3(0.45, 0.4, 0.28);
    vec3 ice  = vec3(0.7, 0.8, 0.85);

    vec3 col = mix(deep, mid, smoothstep(0.25, 0.45, s));
    col = mix(col, land, smoothstep(0.45, 0.62, s));
    col = mix(col, high, smoothstep(0.62, 0.8, s));
    col = mix(col, ice, smoothstep(0.75, 0.92, abs(n.y)));

    vec3 L = normalize(vec3(0.5, 0.4, 0.55));
    float NdotL = dot(N, L);
    float day = smoothstep(-0.05, 0.2, NdotL);
    col *= mix(0.05, 0.2 + max(NdotL, 0.0) * 1.0, day);

    float fresnel = pow(1.0 - max(dot(N, vViewDir), 0.0), 2.2);
    col += vec3(0.15, 0.55, 0.7) * fresnel * 0.6;
    col += vec3(0.3, 0.8, 1.0) * pow(fresnel, 4.0) * 0.3;

    gl_FragColor = vec4(col, 1.0);
  }
`

// Gas giant — rich cinematic bands
const gasFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vViewDir;
  ${noiseGLSL}
  void main() {
    vec3 n = normalize(vPos);
    vec3 N = normalize(vNormal);
    float bands = sin(n.y * 16.0 + fbm(n * 3.5) * 2.8) * 0.5 + 0.5;
    float fine = sin(n.y * 45.0 + fbm(n * 9.0) * 1.8) * 0.5 + 0.5;

    vec3 c1 = vec3(0.65, 0.48, 0.28);
    vec3 c2 = vec3(0.28, 0.18, 0.1);
    vec3 c3 = vec3(0.85, 0.72, 0.52);
    vec3 c4 = vec3(0.5, 0.35, 0.22);
    vec3 col = mix(c2, c1, bands);
    col = mix(col, c3, smoothstep(0.5, 0.9, bands) * 0.5);
    col = mix(col, c4, fine * 0.3);

    float storm = smoothstep(0.55, 0.72, fbm(n * 5.5 + vec3(2.5, 0.15, 0.0)));
    float stormY = smoothstep(0.2, 0.05, abs(n.y - 0.12));
    col = mix(col, vec3(0.7, 0.2, 0.1), storm * stormY * 0.75);

    vec3 L = normalize(vec3(0.45, 0.5, 0.5));
    float NdotL = max(dot(N, L), 0.0);
    float day = smoothstep(-0.05, 0.2, dot(N, L));
    col *= mix(0.06, 0.18 + NdotL * 0.95, day);

    float fresnel = pow(1.0 - max(dot(N, vViewDir), 0.0), 2.3);
    col += vec3(0.5, 0.35, 0.15) * fresnel * 0.4;
    col += vec3(0.9, 0.7, 0.4) * pow(fresnel, 5.0) * 0.2;

    gl_FragColor = vec4(col, 1.0);
  }
`

// Icy / distant — blue atmospheric premium
const icyFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vViewDir;
  ${noiseGLSL}
  void main() {
    vec3 n = normalize(vPos);
    vec3 N = normalize(vNormal);
    float s = fbm(n * 4.0) + fbm(n * 11.0) * 0.4;

    vec3 dark = vec3(0.06, 0.08, 0.14);
    vec3 mid  = vec3(0.2, 0.28, 0.4);
    vec3 ice  = vec3(0.65, 0.75, 0.9);
    vec3 col = mix(dark, mid, smoothstep(0.25, 0.55, s));
    col = mix(col, ice, smoothstep(0.55, 0.85, s) * 0.7);

    float crack = smoothstep(0.47, 0.53, abs(fbm(n * 9.0) - 0.5));
    col = mix(col, dark, crack * 0.45);

    vec3 L = normalize(vec3(0.4, 0.55, 0.5));
    float NdotL = max(dot(N, L), 0.0);
    float day = smoothstep(-0.05, 0.2, dot(N, L));
    col *= mix(0.05, 0.15 + NdotL * 1.0, day);

    float fresnel = pow(1.0 - max(dot(N, vViewDir), 0.0), 2.0);
    col += vec3(0.25, 0.5, 0.95) * fresnel * 0.65;
    col += vec3(0.5, 0.75, 1.0) * pow(fresnel, 4.0) * 0.35;

    gl_FragColor = vec4(col, 1.0);
  }
`

const PLANET_SHADERS = {
  earth: earthFrag,
  alien: alienFrag,
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
      <sphereGeometry args={[1, 96, 96]} />
      <shaderMaterial vertexShader={planetVert} fragmentShader={PLANET_SHADERS[type] || earthFrag} />
    </mesh>
  )
}

export default function BackgroundPlanets() {
  const asteroids = useMemo(
    () => [
      { id: 'a1', position: [-50, 30, 45], scale: 4.5, seed: 1.1, tumble: [0.1, 0.14, 0.08], drift: [2, 1.5, 1] },
      { id: 'a2', position: [60, -35, 40], scale: 3.5, seed: 2.3, tumble: [0.12, 0.09, 0.11], drift: [1.5, 2, 0.8] },
      { id: 'a3', position: [35, 42, 30], scale: 2.4, seed: 3.7, tumble: [0.18, 0.12, 0.09], drift: [1.2, 1.6, 0.9] },
      { id: 'a4', position: [-70, -18, 55], scale: 5.5, seed: 4.2, tumble: [0.07, 0.1, 0.12], drift: [2.2, 1.2, 1.4] },
      { id: 'a5', position: [85, 12, 25], scale: 2.2, seed: 5.5, tumble: [0.15, 0.2, 0.1], drift: [1, 1.4, 0.6] },
      { id: 'a6', position: [-30, 48, 35], scale: 1.8, seed: 6.1, tumble: [0.22, 0.14, 0.18], drift: [1.3, 1, 0.7] },
      { id: 'a7', position: [45, -48, 50], scale: 3.0, seed: 7.8, tumble: [0.09, 0.16, 0.11], drift: [1.8, 1.6, 1] },
      { id: 'a8', position: [-90, 8, 20], scale: 4.0, seed: 8.4, tumble: [0.08, 0.1, 0.06], drift: [1.6, 1.2, 1.1] },
      { id: 'b1', position: [125, 50, -45], scale: 5.5, seed: 9.2, tumble: [0.05, 0.08, 0.04], drift: [2.5, 1.8, 1.2] },
      { id: 'b2', position: [-115, -55, -35], scale: 4.5, seed: 10.5, tumble: [0.07, 0.09, 0.06], drift: [2, 1.8, 1] },
      { id: 'b3', position: [100, -75, -25], scale: 3.2, seed: 11.3, tumble: [0.1, 0.07, 0.09], drift: [1.8, 1.4, 0.9] },
      { id: 'b4', position: [-95, 65, -55], scale: 2.8, seed: 12.7, tumble: [0.12, 0.14, 0.08], drift: [1.5, 2, 0.7] },
      { id: 'c1', position: [22, 22, 60], scale: 1.2, seed: 13.1, tumble: [0.25, 0.2, 0.18], drift: [0.9, 1.1, 0.4] },
      { id: 'c2', position: [-40, -42, 45], scale: 1.5, seed: 14.6, tumble: [0.2, 0.24, 0.14], drift: [1.1, 0.9, 0.5] },
      { id: 'c3', position: [72, 2, 55], scale: 1.0, seed: 15.2, tumble: [0.3, 0.18, 0.22], drift: [0.7, 1.2, 0.4] },
      { id: 'd1', position: [185, -45, -130], scale: 7.5, seed: 16.8, tumble: [0.03, 0.04, 0.03], drift: [3.5, 2, 1.8] },
      { id: 'd2', position: [-170, 55, -145], scale: 6.5, seed: 17.4, tumble: [0.035, 0.03, 0.04], drift: [3, 2.2, 1.4] },
      // Fill empty right / mid voids
      { id: 'e1', position: [280, 35, -90], scale: 4.2, seed: 18.1, tumble: [0.06, 0.08, 0.05], drift: [2.2, 1.5, 1] },
      { id: 'e2', position: [270, -90, -70], scale: 3.5, seed: 19.3, tumble: [0.09, 0.07, 0.1], drift: [1.8, 2, 0.9] },
      { id: 'e3', position: [310, -30, -120], scale: 5.0, seed: 20.2, tumble: [0.04, 0.05, 0.04], drift: [2.5, 1.6, 1.3] },
      { id: 'e4', position: [240, 110, -100], scale: 2.8, seed: 21.5, tumble: [0.11, 0.13, 0.08], drift: [1.4, 1.8, 0.7] },
      { id: 'e5', position: [200, -130, -80], scale: 3.8, seed: 22.0, tumble: [0.07, 0.09, 0.06], drift: [2, 1.4, 1.1] },
      { id: 'e6', position: [330, 50, -160], scale: 6.0, seed: 23.4, tumble: [0.03, 0.04, 0.03], drift: [3, 2, 1.5] },
      { id: 'e7', position: [20, -150, -90], scale: 2.5, seed: 24.1, tumble: [0.14, 0.1, 0.12], drift: [1.2, 1.6, 0.8] },
      { id: 'e8', position: [50, 140, -120], scale: 3.0, seed: 25.6, tumble: [0.08, 0.11, 0.07], drift: [1.6, 1.9, 0.9] },
      { id: 'f1', position: [-140, -80, -90], scale: 4.0, seed: 26.2, tumble: [0.06, 0.08, 0.05], drift: [2.1, 1.7, 1.2] },
      { id: 'f2', position: [-50, -100, -40], scale: 2.2, seed: 27.8, tumble: [0.16, 0.12, 0.14], drift: [1.3, 1.5, 0.6] },
      { id: 'f3', position: [30, -85, -20], scale: 1.8, seed: 28.3, tumble: [0.2, 0.15, 0.18], drift: [1, 1.3, 0.5] },
      { id: 'f4', position: [55, 100, -60], scale: 2.0, seed: 29.1, tumble: [0.18, 0.14, 0.16], drift: [1.1, 1.4, 0.6] },
      { id: 'f5', position: [-200, -30, -100], scale: 5.5, seed: 30.5, tumble: [0.04, 0.05, 0.04], drift: [2.8, 1.9, 1.4] },
    ],
    [],
  )

  return (
    <group>
      {/* Scattered across the full volume — corners, depths, not clustered */}
      <Planet position={[210, 95, -200]} scale={24} type="earth" rotSpeed={0.006} />
      <Planet position={[-190, -70, -210]} scale={20} type="alien" rotSpeed={0.009} />
      <Planet position={[55, -130, -180]} scale={18} type="gas" rotSpeed={0.011} />
      <Planet position={[-140, 110, -240]} scale={15} type="icy" rotSpeed={0.005} />
      <Planet position={[300, -55, -160]} scale={13} type="icy" rotSpeed={0.007} />
      <Planet position={[180, 130, -260]} scale={11} type="alien" rotSpeed={0.01} />
      <Planet position={[-60, -140, -120]} scale={12} type="gas" rotSpeed={0.008} />
      <Planet position={[320, 40, -280]} scale={16} type="gas" rotSpeed={0.004} />
      <Planet position={[-220, 30, -150]} scale={10} type="earth" rotSpeed={0.005} />
      <Planet position={[90, 140, -220]} scale={9} type="icy" rotSpeed={0.012} />
      <Planet position={[260, -120, -200]} scale={14} type="alien" rotSpeed={0.007} />
      <Planet position={[-100, -20, -300]} scale={17} type="gas" rotSpeed={0.006} />

      {/* Near-black matte asteroids */}
      {asteroids.map((a) => (
        <Asteroid key={a.id} {...a} />
      ))}
    </group>
  )
}
