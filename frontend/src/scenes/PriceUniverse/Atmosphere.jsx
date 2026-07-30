import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Atmosphere V2 — Step 1 of the galaxy rebuild.
 *
 * ONLY:
 *  - Deep space void
 *  - Multi-depth tiny stars
 *  - Soft nebula clouds
 *  - Fog / color bridge
 *  - Fine dust
 *
 * No galaxies. No products. Art-directed space that feels expensive.
 */

// ─── Textures ───────────────────────────────────────────────────────────────
function makeStarSprite() {
  const s = 32
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.6)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.1)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

function makeNebulaSprite() {
  const s = 256
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  // Soft irregular-ish falloff using layered radials
  for (let i = 0; i < 5; i++) {
    const cx = s * (0.3 + Math.random() * 0.4)
    const cy = s * (0.3 + Math.random() * 0.4)
    const r = s * (0.25 + Math.random() * 0.35)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, 'rgba(255,255,255,0.35)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.08)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  }
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

function hash(i, s = 0) {
  let h = Math.imul(i ^ (s * 0x9e3779b9), 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function buildStarField(count, spread, zNear, zFar, sizeMin, sizeMax, palette) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (hash(i, 1) - 0.5) * spread[0]
    positions[i * 3 + 1] = (hash(i, 2) - 0.5) * spread[1]
    positions[i * 3 + 2] = zNear + hash(i, 3) * (zFar - zNear)
    const p = palette[Math.floor(hash(i, 4) * palette.length)]
    const v = 0.4 + hash(i, 5) * 0.6
    colors[i * 3] = p[0] * v
    colors[i * 3 + 1] = p[1] * v
    colors[i * 3 + 2] = p[2] * v
    sizes[i] = sizeMin + hash(i, 6) * (sizeMax - sizeMin)
  }
  return { positions, colors, sizes, count }
}

const FAR_PALETTE = [
  [0.75, 0.8, 1.0],
  [1.0, 0.95, 0.9],
  [0.85, 0.88, 1.0],
  [1.0, 0.85, 0.75],
]
const MID_PALETTE = [
  [0.9, 0.92, 1.0],
  [1.0, 0.9, 0.85],
  [0.8, 0.9, 1.0],
]

export default function Atmosphere() {
  const { size } = useThree()
  const starTex = useMemo(() => makeStarSprite(), [])
  const nebTex = useMemo(() => makeNebulaSprite(), [])
  const drift = useRef(0)

  const far = useMemo(
    () => buildStarField(45000, [220, 140], -280, -180, 0.25, 0.7, FAR_PALETTE),
    [],
  )
  const mid = useMemo(
    () => buildStarField(12000, [160, 100], -170, -100, 0.4, 1.1, MID_PALETTE),
    [],
  )
  const near = useMemo(
    () => buildStarField(2500, [100, 70], -95, -50, 0.7, 1.6, MID_PALETTE),
    [],
  )
  const dust = useMemo(
    () => buildStarField(8000, [180, 110], -200, -80, 0.3, 0.9, [
      [0.4, 0.25, 0.5],
      [0.2, 0.35, 0.5],
      [0.5, 0.3, 0.2],
    ]),
    [],
  )

  // Large soft nebula plates — purple left, blue right, violet center
  const nebulae = useMemo(
    () => [
      { pos: [-45, 18, -120], color: '#4a2080', scale: 110, opacity: 0.14 },
      { pos: [-20, -10, -140], color: '#2a1450', scale: 90, opacity: 0.1 },
      { pos: [50, 12, -130], color: '#0a5070', scale: 100, opacity: 0.12 },
      { pos: [70, -15, -150], color: '#0a4060', scale: 85, opacity: 0.09 },
      { pos: [10, 5, -160], color: '#301850', scale: 120, opacity: 0.08 },
      { pos: [-60, 30, -100], color: '#5a3020', scale: 70, opacity: 0.06 },
    ],
    [],
  )

  useFrame((_, dt) => {
    drift.current += dt * 0.02
  })

  const StarLayer = ({ data, sizeMul, opacity, order }) => (
    <points frustumCulled={false} renderOrder={order}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={data.count} array={data.positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={data.count} array={data.colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={sizeMul}
        vertexColors
        map={starTex}
        alphaMap={starTex}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )

  return (
    <group renderOrder={-1000}>
      {/* Deep void — slightly lifted navy, never pure #000 */}
      <mesh position={[0, 0, -300]} renderOrder={-100}>
        <planeGeometry args={[500, 350]} />
        <meshBasicMaterial color="#05050e" depthWrite={false} />
      </mesh>

      {/* Nebula clouds */}
      {nebulae.map((n, i) => (
        <mesh key={i} position={n.pos} renderOrder={-90}>
          <planeGeometry args={[n.scale, n.scale * 0.75]} />
          <meshBasicMaterial
            map={nebTex}
            color={n.color}
            transparent
            opacity={n.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Color bridge fog — very soft orange→purple→cyan */}
      <mesh position={[0, 0, -200]} renderOrder={-85}>
        <planeGeometry args={[400, 280]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            void main() {
              vec2 uv = vUv;
              vec3 orange = vec3(0.06, 0.02, 0.0);
              vec3 purple = vec3(0.04, 0.01, 0.07);
              vec3 blue   = vec3(0.0, 0.025, 0.06);
              float x = uv.x;
              vec3 col = mix(orange, purple, smoothstep(0.15, 0.5, x));
              col = mix(col, blue, smoothstep(0.45, 0.85, x));
              float vig = 1.0 - smoothstep(0.25, 0.95, length(uv - 0.5));
              float a = 0.22 * vig;
              gl_FragColor = vec4(col, a);
            }
          `}
        />
      </mesh>

      <StarLayer data={far} sizeMul={0.55} opacity={0.7} order={-80} />
      <StarLayer data={dust} sizeMul={0.45} opacity={0.25} order={-75} />
      <StarLayer data={mid} sizeMul={0.85} opacity={0.75} order={-70} />
      <StarLayer data={near} sizeMul={1.2} opacity={0.85} order={-65} />
    </group>
  )
}
