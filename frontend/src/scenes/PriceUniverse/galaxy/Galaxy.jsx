import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Galaxy — continuous spiral arm ribbons (mockup-style).
 * Mesh ribbons guarantee visible arms at any distance; particles add texture.
 */

function makePalette(theme = 'orange') {
  if (theme === 'cyan') {
    return {
      core: '#E8FFFF',
      mid: '#6AE8F8',
      arm: '#22D0E8',
      deep: '#0AA0C0',
      light: '#b0faff',
    }
  }
  return {
    core: '#FFF8E0',
    mid: '#FFB848',
    arm: '#FF9220',
    deep: '#E87010',
    light: '#ffe8a8',
  }
}

function hash(i, s) {
  let h = Math.imul(i ^ (s * 0x9e3779b9), 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function gauss(i, s) {
  const u1 = Math.max(hash(i, s), 1e-6)
  const u2 = hash(i, s + 1)
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2)
}

function makeSoftTex() {
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

/** Soft strip texture for arm ribbons (bright center, fade edges) */
function makeRibbonTex() {
  const w = 128
  const h = 32
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.5, 'rgba(255,255,255,1)')
  g.addColorStop(0.65, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // mild length falloff
  const gx = ctx.createLinearGradient(0, 0, w, 0)
  gx.addColorStop(0, 'rgba(0,0,0,0.15)')
  gx.addColorStop(0.15, 'rgba(0,0,0,0)')
  gx.addColorStop(0.85, 'rgba(0,0,0,0)')
  gx.addColorStop(1, 'rgba(0,0,0,0.35)')
  ctx.fillStyle = gx
  ctx.fillRect(0, 0, w, h)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

const ARM_COUNT = 4
const SPIRAL_TURNS = 0.95

/**
 * Build a ribbon mesh along a logarithmic spiral arm.
 * Returns BufferGeometry for a continuous strip.
 */
function buildArmRibbon(radius, armIndex, widthScale = 1) {
  const segments = 96
  const r0 = radius * 0.08
  const rMax = radius * 1.0
  const kLog = -(SPIRAL_TURNS * Math.PI * 2) / Math.log(rMax / r0)
  const phase = (armIndex / ARM_COUNT) * Math.PI * 2

  const positions = []
  const uvs = []
  const indices = []

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    // ease outward
    const te = Math.pow(t, 0.85)
    const r = r0 + te * (rMax - r0)
    const theta = phase + kLog * Math.log(Math.max(r, r0 * 1.01) / r0)

    // arm width grows then fades at rim
    const width = radius * (0.045 + 0.07 * te) * (1 - te * 0.35) * widthScale
    const px = -Math.sin(theta)
    const pz = Math.cos(theta)

    const cx = Math.cos(theta) * r
    const cz = Math.sin(theta) * r

    // two edges of the ribbon
    positions.push(cx + px * width, 0.02, cz + pz * width)
    positions.push(cx - px * width, -0.02, cz - pz * width)
    uvs.push(t, 1, t, 0)
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/** Dense particles along arms for dust texture */
function buildArmDust(radius, palette) {
  const positions = []
  const colors = []
  const colArm = new THREE.Color(palette.arm)
  const colMid = new THREE.Color(palette.mid)
  const colDeep = new THREE.Color(palette.deep)
  const colCore = new THREE.Color(palette.core)

  const r0 = radius * 0.08
  const rMax = radius * 1.02
  const kLog = -(SPIRAL_TURNS * Math.PI * 2) / Math.log(rMax / r0)

  for (let arm = 0; arm < ARM_COUNT; arm++) {
    const phase = (arm / ARM_COUNT) * Math.PI * 2
    const samples = 2200
    for (let i = 0; i < samples; i++) {
      const t = Math.pow(i / (samples - 1), 0.8)
      if (t < 0.04) continue
      if (Math.sin(t * Math.PI * 6 + arm) > 0.93 && hash(i + arm * 300, 2) < 0.4) continue

      const r = r0 + t * (rMax - r0)
      const theta = phase + kLog * Math.log(r / r0)
      const sigma = radius * (0.025 + 0.05 * t)
      const side = gauss(i + arm * 800, 3) * sigma
      const y = gauss(i + arm * 800, 4) * sigma * 0.5
      const x = Math.cos(theta) * r + Math.cos(theta + Math.PI / 2) * side
      const z = Math.sin(theta) * r + Math.sin(theta + Math.PI / 2) * side

      let c
      if (t < 0.18) c = colCore
      else if (t < 0.45) c = colMid
      else if (t < 0.72) c = colArm
      else c = colDeep

      const bright = (0.7 + hash(i, 5) * 0.4) * Math.pow(1 - t * 0.28, 0.6)
      positions.push(x, y, z)
      colors.push(c.r * bright, c.g * bright, c.b * bright)
    }
  }

  // Core cluster
  for (let i = 0; i < 2000; i++) {
    const gx = gauss(i, 30) * radius * 0.11
    const gy = gauss(i, 31) * radius * 0.04
    const gz = gauss(i, 32) * radius * 0.11
    const dist = Math.sqrt(gx * gx + gz * gz) / (radius * 0.11)
    if (dist > 2.0) continue
    const b = (0.9 - dist * 0.35) * (0.55 + hash(i, 33) * 0.45)
    positions.push(gx, gy, gz)
    colors.push(colCore.r * b, colCore.g * b, colCore.b * b)
  }

  return {
    pos: new Float32Array(positions),
    col: new Float32Array(colors),
    count: positions.length / 3,
  }
}

function PointsLayer({ data, size, opacity, map }) {
  if (!data?.count) return null
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={data.count} array={data.pos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={data.count} array={data.col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        vertexColors
        map={map}
        alphaMap={map}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

export default function Galaxy({
  center = { x: 42, y: 2, z: -8 },
  radius = 32,
  theme = 'orange',
  spin = 0.028,
}) {
  const group = useRef()
  const soft = useMemo(() => makeSoftTex(), [])
  const ribbonTex = useMemo(() => makeRibbonTex(), [])
  const palette = useMemo(() => makePalette(theme), [theme])
  const dust = useMemo(() => buildArmDust(radius, palette), [radius, palette])

  const ribbons = useMemo(() => {
    const list = []
    for (let a = 0; a < ARM_COUNT; a++) {
      list.push({
        key: `arm-${a}`,
        geo: buildArmRibbon(radius, a, 1),
        color: palette.arm,
        opacity: 0.55,
      })
      // slightly offset secondary ribbon for thickness
      list.push({
        key: `arm-s-${a}`,
        geo: buildArmRibbon(radius, a, 0.55),
        color: palette.mid,
        opacity: 0.35,
      })
    }
    return list
  }, [radius, palette])

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * spin
  })

  const coreCol = palette.light
  const coreR = radius * 0.15
  const midR = radius * 0.3
  const outerR = radius * 0.52

  return (
    <group
      ref={group}
      position={[center.x, center.y ?? 0, center.z]}
      rotation={[-0.84, 0.12, 0.32]}
    >
      {/* Continuous spiral arm ribbons — always visible */}
      {ribbons.map((r) => (
        <mesh key={r.key} geometry={r.geo} renderOrder={-8}>
          <meshBasicMaterial
            map={ribbonTex}
            color={r.color}
            transparent
            opacity={r.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Dust texture on arms */}
      <PointsLayer data={dust} size={0.7} opacity={0.85} map={soft} />
      <PointsLayer data={dust} size={1.4} opacity={0.25} map={soft} />

      {/* Hot core */}
      <mesh rotation={[-0.15, 0, 0]} renderOrder={-4}>
        <planeGeometry args={[outerR * 2, outerR * 2]} />
        <meshBasicMaterial
          map={soft}
          color={coreCol}
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-0.15, 0, 0]} renderOrder={-3}>
        <planeGeometry args={[midR * 2, midR * 2]} />
        <meshBasicMaterial
          map={soft}
          color={coreCol}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-0.15, 0, 0]} renderOrder={-2}>
        <planeGeometry args={[coreR * 2, coreR * 2]} />
        <meshBasicMaterial
          map={soft}
          color="#ffffff"
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <pointLight color={coreCol} intensity={2.2} distance={radius * 2} decay={2} />
    </group>
  )
}
