import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import ProductNode from '../ProductNode'

/**
 * Galaxy — next-level cinematic particle spiral.
 * Dense volumetric arms, multi-layer core, dark inter-arm voids,
 * face-on mild tilt so the disc + core read clearly.
 */

function makePalette(theme = 'orange') {
  if (theme === 'cyan') {
    return {
      nucleus: new THREE.Color('#F0FFFF'),
      bulge: new THREE.Color('#B8F0FF'),
      gold: new THREE.Color('#7AE8FF'),
      amber: new THREE.Color('#3DD8F0'),
      arm: new THREE.Color('#1AC8E0'),
      deep: new THREE.Color('#0A90B0'),
      ember: new THREE.Color('#087090'),
      hot: new THREE.Color('#FFFFFF'),
      light: '#b0faff',
    }
  }
  return {
    nucleus: new THREE.Color('#FFF8E8'),
    bulge: new THREE.Color('#FFE9A0'),
    gold: new THREE.Color('#FFD060'),
    amber: new THREE.Color('#FFB038'),
    arm: new THREE.Color('#FF8C1A'),
    deep: new THREE.Color('#E86800'),
    ember: new THREE.Color('#C05010'),
    hot: new THREE.Color('#FFFFFF'),
    light: '#fff6d0',
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
  g.addColorStop(0.2, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.1)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

const ARM_COUNT = 6
const SPIRAL_TURNS = 1.15

function buildGalaxy(radius, COL) {
  const positions = []
  const colors = []

  const push = (x, y, z, col, b) => {
    const bb = Math.min(1, Math.max(0, b))
    positions.push(x, y, z)
    colors.push(col.r * bb, col.g * bb, col.b * bb)
  }

  const r0 = radius * 0.07
  const rMax = radius * 1.05
  const kLog = -(SPIRAL_TURNS * Math.PI * 2) / Math.log(rMax / r0)

  // ── CORE layers (nested, soft falloff) ──────────────────────
  const coreLayers = [
    { n: 2800, sc: 0.04, flat: 0.4, col: COL.nucleus, b: 0.95 },
    { n: 4000, sc: 0.07, flat: 0.42, col: COL.bulge, b: 0.8 },
    { n: 5000, sc: 0.11, flat: 0.45, col: COL.gold, b: 0.6 },
    { n: 4000, sc: 0.16, flat: 0.48, col: COL.amber, b: 0.4 },
  ]
  for (const L of coreLayers) {
    for (let i = 0; i < L.n; i++) {
      const gx = gauss(i + L.n, 1) * radius * L.sc
      const gy = gauss(i + L.n, 2) * radius * L.sc * L.flat
      const gz = gauss(i + L.n, 3) * radius * L.sc
      const dist = Math.sqrt(gx * gx + gz * gz) / (radius * L.sc)
      if (dist > 2.4) continue
      push(gx, gy, gz, L.col, L.b * Math.max(0.15, 1 - dist * 0.35) * (0.7 + hash(i, 4) * 0.3))
    }
  }

  // ── Central bar (real spiral galaxies have one) ─────────────
  const barAngle = 0.35
  const barLen = radius * 0.22
  for (let i = 0; i < 3500; i++) {
    const u = (hash(i, 10) - 0.5) * 2
    const along = u * barLen
    const side = gauss(i, 11) * radius * 0.028
    const x = Math.cos(barAngle) * along - Math.sin(barAngle) * side
    const z = Math.sin(barAngle) * along + Math.cos(barAngle) * side
    const y = gauss(i, 12) * radius * 0.025
    const t = Math.abs(u)
    const col = t < 0.3 ? COL.gold : t < 0.6 ? COL.amber : COL.arm
    push(x, y, z, col, (0.55 - t * 0.25) * (0.75 + hash(i, 13) * 0.25))
  }

  // ── Spiral arms — dense volumetric dust rivers ──────────────
  for (let arm = 0; arm < ARM_COUNT; arm++) {
    const phase = (arm / ARM_COUNT) * Math.PI * 2 + (hash(arm, 20) - 0.5) * 0.1
    const samples = 6000

    for (let i = 0; i < samples; i++) {
      const t = Math.pow(i / (samples - 1), 0.75)
      if (t < 0.04) continue

      // Soft gaps for organic structure
      if (Math.sin(t * Math.PI * 6.5 + arm * 1.8) > 0.96 && hash(i + arm * 500, 21) < 0.3) continue
      // Density wave — denser mid-arm
      const densityWave = 0.5 + 0.5 * Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 11 + arm), 1.3)
      if (hash(i, 22) > 0.55 + densityWave * 0.45) continue

      const r = r0 + t * (rMax - r0)
      const theta = phase + kLog * Math.log(r / r0)

      // Width grows outward, stays tight to ridge for clear lanes
      const sigma = radius * (0.022 + 0.045 * t)
      const ridge = gauss(i + arm * 1000, 23)
      if (Math.abs(ridge) > 2.2 && hash(i, 24) < 0.6) continue
      const turb = Math.sin(t * 30 + arm * 5) * 0.12
      const side = ridge * sigma * 0.45 + turb * sigma * 0.25
      const y = gauss(i + arm * 1000, 25) * sigma * 0.3

      const x = Math.cos(theta) * r + Math.cos(theta + Math.PI / 2) * side
      const z = Math.sin(theta) * r + Math.sin(theta + Math.PI / 2) * side

      // Color by radius
      let col
      if (t < 0.12) col = hash(i, 26) < 0.5 ? COL.gold : COL.amber
      else if (t < 0.35) col = hash(i, 26) < 0.5 ? COL.amber : COL.arm
      else if (t < 0.65) col = hash(i, 26) < 0.55 ? COL.arm : COL.deep
      else col = hash(i, 26) < 0.5 ? COL.deep : COL.ember

      const ridgeBoost = 1 - Math.min(1, Math.abs(ridge) * 0.25)
      const bright =
        (0.7 + hash(i, 27) * 0.35) *
        ridgeBoost *
        Math.pow(1 - t * 0.3, 0.55) *
        (0.9 + densityWave * 0.15)

      // Rare hot stars
      if (hash(i, 28) > 0.97) {
        push(x, y, z, COL.hot, bright * 1.2)
      } else {
        push(x, y, z, col, bright)
      }
    }

    // Stellar associations (bright clumps off the main ridge)
    for (let j = 0; j < 6; j++) {
      const t0 = 0.18 + hash(arm * 10 + j, 30) * 0.55
      const r = r0 + t0 * (rMax - r0)
      const theta0 = phase + kLog * Math.log(r / r0) + (hash(j, 31) - 0.5) * 0.35
      const cx = Math.cos(theta0) * r
      const cz = Math.sin(theta0) * r
      for (let p = 0; p < 60; p++) {
        const idx = arm * 100 + j * 60 + p
        const x = cx + gauss(idx, 32) * radius * 0.02
        const z = cz + gauss(idx, 33) * radius * 0.02
        const y = gauss(idx, 34) * radius * 0.015
        push(x, y, z, t0 < 0.35 ? COL.gold : COL.amber, 0.4 + hash(idx, 35) * 0.3)
      }
    }
  }

  // Sparse outer halo
  for (let i = 0; i < 1200; i++) {
    const rn = 0.9 + hash(i, 40) * 0.4
    const theta = hash(i, 41) * Math.PI * 2
    const r = rn * radius
    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r
    const y = gauss(i, 42) * radius * 0.04
    push(x, y, z, COL.ember, 0.03 + hash(i, 43) * 0.04)
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
  radius = 64,
  theme = 'orange',
  spin = 0.012,
  products = [],
  selectedId = null,
  onSelect = () => {},
}) {
  const group = useRef()
  const soft = useMemo(() => makeSoftTex(), [])
  const COL = useMemo(() => makePalette(theme), [theme])
  const data = useMemo(() => buildGalaxy(radius, COL), [radius, COL])

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * spin
  })

  const coreCol = COL.light
  const coreR = radius * 0.16
  const midR = radius * 0.32
  const outerR = radius * 0.55

  return (
    <group
      ref={group}
      position={[center.x, center.y ?? 0, center.z]}
      rotation={[-0.48, 0.08, 0.06]}
    >
      {/* Dense particle body */}
      <PointsLayer data={data} size={1.15} opacity={1} map={soft} />
      {/* Soft bloom layer */}
      <PointsLayer data={data} size={2.0} opacity={0.28} map={soft} />

      {/* Multi-layer core glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} renderOrder={-4}>
        <planeGeometry args={[outerR * 2, outerR * 2]} />
        <meshBasicMaterial
          map={soft}
          color={coreCol}
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} renderOrder={-3}>
        <planeGeometry args={[midR * 2, midR * 2]} />
        <meshBasicMaterial
          map={soft}
          color={coreCol}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} renderOrder={-2}>
        <planeGeometry args={[coreR * 2, coreR * 2]} />
        <meshBasicMaterial
          map={soft}
          color="#ffffff"
          transparent
          opacity={0.92}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <pointLight color={coreCol} intensity={4.5} distance={radius * 3} decay={2} />

      {/* Products embedded on arms — children of rotating group = planets on orbits */}
      {products.map((node) => (
        <ProductNode
          key={node.id}
          node={{
            ...node,
            position: node.localPosition ?? node.position,
          }}
          isSelected={node.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}
