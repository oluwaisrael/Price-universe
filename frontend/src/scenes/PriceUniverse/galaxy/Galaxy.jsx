import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * PHASE 2 — Full procedural barred spiral galaxy.
 * Generate once. Animate with lightweight group rotation + per-point drift attributes.
 */

// ── colors by population ──────────────────────────────────────
function makePalette(theme = 'orange') {
  if (theme === 'cyan') {
    return {
      nucleus: new THREE.Color('#E8FFFF'),
      bulge: new THREE.Color('#B8F0FF'),
      gold: new THREE.Color('#7AE8FF'),
      amber: new THREE.Color('#3DD8F0'),
      orange: new THREE.Color('#1AC8E0'),
      deep: new THREE.Color('#0AA0C0'),
      ember: new THREE.Color('#0880A0'),
      blueHot: new THREE.Color('#FFFFFF'),
      dustDark: new THREE.Color('#0a1820'),
    }
  }
  return {
    nucleus: new THREE.Color('#FFF6D8'),
    bulge: new THREE.Color('#FFE9A0'),
    gold: new THREE.Color('#FFD060'),
    amber: new THREE.Color('#FFB038'),
    orange: new THREE.Color('#FF8C1A'),
    deep: new THREE.Color('#E86800'),
    ember: new THREE.Color('#C05010'),
    blueHot: new THREE.Color('#C8D8FF'),
    dustDark: new THREE.Color('#2a1810'),
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

function makeTex(soft) {
  const s = soft ? 48 : 32
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
  if (soft) {
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.2, 'rgba(255,255,255,0.3)')
    g.addColorStop(0.55, 'rgba(255,255,255,0.05)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
  } else {
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.4)')
    g.addColorStop(0.55, 'rgba(255,255,255,0.04)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

// Arm definition: independent rivers of stars
// primary 4 + secondary 2
function makeArms() {
  const arms = []
  // 4 primary
  for (let a = 0; a < 4; a++) {
    arms.push({
      id: a,
      primary: true,
      phase: (a / 4) * Math.PI * 2 + (hash(a, 1) - 0.5) * 0.35,
      turns: 0.9 + hash(a, 2) * 0.35,
      width: 0.9 + hash(a, 3) * 0.4,
      density: 0.85 + hash(a, 4) * 0.3,
      maxT: 0.7 + hash(a, 5) * 0.3,
      // segments with interruptions
      segments: 3 + Math.floor(hash(a, 6) * 3),
    })
  }
  // 2 faint secondary
  for (let a = 0; a < 2; a++) {
    arms.push({
      id: 10 + a,
      primary: false,
      phase: (a / 2) * Math.PI + 0.4 + (hash(a, 7) - 0.5) * 0.5,
      turns: 0.6 + hash(a, 8) * 0.25,
      width: 0.55 + hash(a, 9) * 0.25,
      density: 0.35 + hash(a, 10) * 0.2,
      maxT: 0.45 + hash(a, 11) * 0.25,
      segments: 2 + Math.floor(hash(a, 12) * 2),
    })
  }
  return arms
}

function buildGalaxy(radius, COL) {
  const arms = makeArms()
  // dust lanes as angular wedges that suppress brightness
  const lanes = Array.from({ length: 5 }, (_, i) => ({
    angle: hash(i, 50) * Math.PI * 2,
    width: 0.08 + hash(i, 51) * 0.1,
    strength: 0.7 + hash(i, 52) * 0.25,
  }))

  // Collect into class buckets
  const cls = {
    A: { pos: [], col: [] }, // micro dust
    B: { pos: [], col: [] }, // normal stars
    C: { pos: [], col: [] }, // hot blue-white
    D: { pos: [], col: [] }, // orange giants
    E: { pos: [], col: [] }, // bright associations
  }
  const push = (k, x, y, z, color, b) => {
    const bb = Math.min(0.93, b)
    cls[k].pos.push(x, y, z)
    cls[k].col.push(color.r * bb, color.g * bb, color.b * bb)
  }

  // ════════════════════════════════════════════
  // CORE — 5 nested layers, no pure-white clip
  // ════════════════════════════════════════════
  const coreLayers = [
    { n: 3500, sc: 0.028, flat: 0.55, col: COL.nucleus, b: 0.88, k: 'E' },
    { n: 6000, sc: 0.05, flat: 0.5, col: COL.bulge, b: 0.78, k: 'D' },
    { n: 9000, sc: 0.08, flat: 0.48, col: COL.gold, b: 0.65, k: 'B' },
    { n: 8000, sc: 0.12, flat: 0.45, col: COL.amber, b: 0.5, k: 'B' },
    { n: 7000, sc: 0.17, flat: 0.42, col: COL.orange, b: 0.35, k: 'A' },
  ]
  for (const L of coreLayers) {
    for (let i = 0; i < L.n; i++) {
      const gx = gauss(i + L.n, 1)
      const gy = gauss(i + L.n, 2)
      const gz = gauss(i + L.n, 3)
      const s = radius * L.sc
      const x = gx * s, y = gy * s * L.flat, z = gz * s
      const dist = Math.sqrt(gx*gx + gy*gy + gz*gz)
      if (dist > 2.5) continue
      // dust lanes near core (wrap)
      let laneMul = 1
      const ang = Math.atan2(z, x)
      for (const lane of lanes) {
        let d = Math.abs(((ang - lane.angle + Math.PI) % (Math.PI*2)) - Math.PI)
        if (d < lane.width * 0.6) laneMul = Math.min(laneMul, 1 - lane.strength * 0.7)
      }
      if (laneMul < 0.25 && hash(i, 3) < 0.8) {
        push('A', x, y, z, COL.dustDark, 0.08)
        continue
      }
      push(L.k, x, y, z, L.col, L.b * Math.max(0.2, 1 - dist * 0.35) * laneMul)
    }
  }

  // ════════════════════════════════════════════
  // BAR — dense elongated structure through nucleus
  // ════════════════════════════════════════════
  const barAngle = 0.4
  const barLen = radius * 0.28
  const barN = 8000
  for (let i = 0; i < barN; i++) {
    const u = (hash(i, 20) - 0.5) * 2 // -1..1 along bar
    const along = u * barLen
    const side = gauss(i, 21) * radius * 0.035
    const x = Math.cos(barAngle) * along - Math.sin(barAngle) * side
    const z = Math.sin(barAngle) * along + Math.cos(barAngle) * side
    const y = gauss(i, 22) * radius * 0.03
    const t = Math.abs(u)
    const col = t < 0.3 ? COL.gold : t < 0.6 ? COL.amber : COL.orange
    const b = (0.55 - t * 0.25) * (0.8 + hash(i, 23) * 0.2)
    const roll = hash(i, 24)
    if (roll < 0.3) push('A', x, y, z, col, b * 0.5)
    else if (roll < 0.85) push('B', x, y, z, col, b)
    else push('D', x, y, z, col, b * 1.05)
  }

  // ════════════════════════════════════════════
  // SPIRAL ARMS — independent segmented rivers
  // ════════════════════════════════════════════
  const r0 = radius * 0.14
  const rMax = radius * 1.05

  for (const arm of arms) {
    const particles = arm.primary ? 14000 : 4500
    const kLog = (arm.turns * Math.PI * 2) / Math.log(rMax / r0)

    // Precompute segment gaps (interruptions along arm)
    const gaps = []
    for (let s = 0; s < arm.segments; s++) {
      const center = (s + 0.5) / arm.segments
      const half = 0.03 + hash(arm.id * 10 + s, 30) * 0.04
      // only some segments have gaps
      if (hash(arm.id * 10 + s, 31) < 0.55) gaps.push({ center, half })
    }

    for (let i = 0; i < particles; i++) {
      let t = Math.pow(hash(i + arm.id * 1000, 40), 0.7)
      if (t > arm.maxT) continue

      // segment interruptions
      let inGap = false
      for (const g of gaps) {
        if (Math.abs(t - g.center) < g.half) { inGap = true; break }
      }
      if (inGap && hash(i, 41) < 0.85) continue

      // local clustering: some t-regions denser
      const clusterWave = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 13 + arm.id), 1.4)
      if (hash(i, 42) > clusterWave * arm.density) continue

      // void pockets
      if (Math.sin(t * Math.PI * 7 + arm.id * 2) < -0.85 && hash(i, 43) < 0.6) continue

      const r = r0 + t * (rMax - r0)
      // per-segment curvature jitter
      const segId = Math.floor(t * arm.segments)
      const curvJitter = (hash(arm.id * 5 + segId, 44) - 0.5) * 0.2
      const theta = arm.phase + kLog * Math.log(r / r0) + curvJitter * t

      // dust lane suppression
      let laneMul = 1
      for (const lane of lanes) {
        let d = Math.abs(((theta - lane.angle + Math.PI) % (Math.PI * 2)) - Math.PI)
        if (d < lane.width) {
          laneMul = Math.min(laneMul, 1 - lane.strength * (1 - d / lane.width))
        }
      }
      if (laneMul < 0.2 && hash(i, 45) < 0.9) {
        // dark dust particle
        const thick = radius * 0.04 * arm.width
        const side = gauss(i, 46) * thick * 0.3
        const x = Math.cos(theta)*r + Math.cos(theta+Math.PI/2)*side
        const z = Math.sin(theta)*r + Math.sin(theta+Math.PI/2)*side
        const y = gauss(i, 47) * thick * 0.4
        push('A', x, y, z, COL.dustDark, 0.07)
        continue
      }

      // arm width varies by segment + turbulence
      const segW = 0.7 + hash(arm.id * 5 + segId, 48) * 0.6
      const turb = Math.sin(t * 28 + arm.id * 6) * 0.2 + Math.sin(t * 51) * 0.1
      const thick = radius * (0.04 + 0.05 * (1 - t * 0.4)) * arm.width * segW
      const ridge = gauss(i, 49)
      // keep tight to ridge for arm definition
      if (Math.abs(ridge) > 1.5 && hash(i, 50) < 0.8) continue
      const side = ridge * thick * 0.45 + turb * thick * 0.35

      const x = Math.cos(theta)*r + Math.cos(theta+Math.PI/2)*side
      const z = Math.sin(theta)*r + Math.sin(theta+Math.PI/2)*side
      // vertical thickness: core thick → outer thin
      const zThick = radius * (0.04 * (1 - t * 0.7) + 0.01)
      const y = gauss(i, 51) * zThick

      // color by radius
      let col
      if (t < 0.12) col = hash(i,52) < 0.5 ? COL.gold : COL.amber
      else if (t < 0.35) col = hash(i,52) < 0.5 ? COL.amber : COL.orange
      else if (t < 0.65) col = hash(i,52) < 0.55 ? COL.orange : COL.deep
      else col = hash(i,52) < 0.5 ? COL.deep : COL.ember

      // Class assignment
      const classRoll = hash(i, 53)
      // rare hot blue stars throughout
      if (classRoll > 0.97) {
        push('C', x, y, z, COL.blueHot, (0.5 + hash(i,54)*0.3) * laneMul)
        continue
      }

      const ridgeBoost = 1 - Math.min(1, Math.abs(ridge) * 0.3)
      const bright = (0.4 + hash(i,55)*0.35) * ridgeBoost * Math.pow(1 - t*0.45, 0.8) * laneMul * (arm.primary ? 1 : 0.7)

      // dense cluster associations
      const isAssoc = clusterWave > 0.85 && hash(i, 56) < 0.25

      if (isAssoc) {
        push('E', x, y, z, t < 0.3 ? COL.gold : COL.amber, Math.min(0.9, bright * 1.3))
      } else if (classRoll < 0.4) {
        push('A', x, y, z, col, bright * 0.5)
      } else if (classRoll < 0.8) {
        push('B', x, y, z, col, bright)
      } else if (classRoll < 0.93) {
        push('D', x, y, z, col, bright * 1.05)
      } else {
        push('E', x, y, z, col, bright * 1.1)
      }
    }

    // Detached stellar associations (off the main arm)
    if (arm.primary) {
      for (let j = 0; j < 8; j++) {
        const t0 = 0.2 + hash(arm.id * 20 + j, 60) * 0.55
        const r = r0 + t0 * (rMax - r0)
        const kLog2 = (arm.turns * Math.PI * 2) / Math.log(rMax / r0)
        const theta0 = arm.phase + kLog2 * Math.log(r / r0) + (hash(j, 61) - 0.5) * 0.5
        const cx = Math.cos(theta0) * r
        const cz = Math.sin(theta0) * r
        for (let p = 0; p < 80; p++) {
          const idx = arm.id * 100 + j * 80 + p
          const x = cx + gauss(idx, 62) * radius * 0.025
          const z = cz + gauss(idx, 63) * radius * 0.025
          const y = gauss(idx, 64) * radius * 0.02
          push(hash(idx,65) < 0.7 ? 'B' : 'E', x, y, z, COL.amber, 0.45 + hash(idx,66)*0.3)
        }
      }
    }
  }

  // ════════════════════════════════════════════
  // OUTER HALO — gradual dissolve
  // ════════════════════════════════════════════
  for (let i = 0; i < 5000; i++) {
    const rn = 0.85 + hash(i, 70) * 0.5
    const theta = hash(i, 71) * Math.PI * 2
    const r = rn * radius
    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r
    const y = gauss(i, 72) * radius * 0.05
    push('A', x, y, z, COL.ember, 0.025 + hash(i, 73) * 0.035)
  }

  // Sparse inter-arm voids stay empty — only tiny dust
  for (let i = 0; i < 2000; i++) {
    const t = hash(i, 80)
    const r = r0 + t * (rMax - r0)
    const theta = hash(i, 81) * Math.PI * 2
    push('A', Math.cos(theta)*r, gauss(i,82)*radius*0.02, Math.sin(theta)*r, COL.deep, 0.03)
  }

  const pack = (c) => ({
    pos: new Float32Array(c.pos),
    col: new Float32Array(c.col),
    count: c.pos.length / 3,
  })
  return {
    A: pack(cls.A),
    B: pack(cls.B),
    C: pack(cls.C),
    D: pack(cls.D),
    E: pack(cls.E),
  }
}

function Layer({ data, size, opacity, map }) {
  if (!data?.count) return null
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={data.count} array={data.pos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={data.count} array={data.col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={size} vertexColors map={map} alphaMap={map}
        transparent opacity={opacity} sizeAttenuation depthWrite={false}
        blending={THREE.AdditiveBlending} toneMapped={false}
      />
    </points>
  )
}

export default function Galaxy({
  center = { x: 42, y: 2, z: -8 },
  radius = 50,
  theme = 'orange',
  spin = 0.012,
}) {
  const group = useRef()
  const hard = useMemo(() => makeTex(false), [])
  const soft = useMemo(() => makeTex(true), [])
  const L = useMemo(() => buildGalaxy(radius, makePalette(theme)), [radius, theme])

  // Subtle galaxy rotation — living system
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * spin
  })

  return (
    <group
      ref={group}
      position={[center.x, center.y ?? 0, center.z]}
      rotation={[-0.58, 0.08, 0.4]}
    >
      {/* Class A — microscopic dust */}
      <Layer data={L.A} size={0.14} opacity={0.45} map={hard} />
      {/* Class B — normal stars */}
      <Layer data={L.B} size={0.32} opacity={0.8} map={hard} />
      {/* Class C — young hot blue-white */}
      <Layer data={L.C} size={0.4} opacity={0.85} map={hard} />
      {/* Class D — orange giants */}
      <Layer data={L.D} size={0.55} opacity={0.88} map={hard} />
      {/* Class E — bright associations */}
      <Layer data={L.E} size={1.0} opacity={0.72} map={soft} />
    </group>
  )
}
