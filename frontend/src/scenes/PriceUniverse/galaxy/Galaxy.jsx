import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Stage 2 — PARTICLE-ONLY Jumia galaxy.
 * No planes. No glow quads. No bloom dependency.
 * Brightness = particle density overlap.
 */

const COLORS = [
  new THREE.Color('#FFF8D7'),
  new THREE.Color('#FFE39C'),
  new THREE.Color('#FFC25E'),
  new THREE.Color('#FF9E35'),
  new THREE.Color('#FF7B21'),
]

function hash(i, s) {
  let h = Math.imul(i ^ (s * 0x9e3779b9), 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function gauss(i, s) {
  // Box-Muller
  const u1 = Math.max(hash(i, s), 1e-6)
  const u2 = hash(i, s + 1)
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2)
}

function makeDot() {
  const s = 32
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.08)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

/**
 * Density zones (normalized radius 0–1 maps to galaxy radius):
 *  core   0 – 0.15  very dense, warmer/whiter
 *  inner  0.15 – 0.45  dense orange disk
 *  outer  0.45 – 0.85  sparser
 *  halo   0.85 – 1.15  almost invisible
 *
 * Spiral modulation pulls mass into 2 arms without planes.
 */
function buildGalaxyParticles(radius, count) {
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const ARM_COUNT = 2
  const TURNS = 1.05
  let w = 0

  for (let i = 0; i < count; i++) {
    // Prefer smaller radii (density falloff) via power distribution
    // Most particles near core/inner disk
    const u = hash(i, 1)
    let rn // normalized radius 0–1.15
    if (u < 0.35) {
      // core
      rn = hash(i, 2) * 0.15
    } else if (u < 0.7) {
      // inner disk
      rn = 0.15 + hash(i, 2) * 0.3
    } else if (u < 0.92) {
      // outer
      rn = 0.45 + hash(i, 2) * 0.4
    } else {
      // halo
      rn = 0.85 + hash(i, 2) * 0.3
    }

    const r = rn * radius

    // Base angle + spiral arm pull
    let theta = hash(i, 3) * Math.PI * 2

    // Spiral arm density: boost probability near arm centerlines
    // Sample arm, then Gaussian offset from arm
    const arm = Math.floor(hash(i, 4) * ARM_COUNT) % ARM_COUNT
    const armOff = (arm / ARM_COUNT) * Math.PI * 2
    // Logarithmic spiral angle at this radius
    const r0 = radius * 0.05
    const k = (TURNS * Math.PI * 2) / Math.log(Math.max(radius / r0, 1.01))
    const spiralTheta = armOff + k * Math.log(Math.max(r, r0) / r0)

    // How tightly stuck to arm (core more isotropic, outer more arm-locked)
    const armLock = rn < 0.15 ? 0.25 : rn < 0.45 ? 0.65 : 0.8
    const armSpread = (0.35 + rn * 0.5) // radians-ish via perpendicular later
    theta = spiralTheta + gauss(i, 5) * armSpread * (1.1 - armLock)

    // Gaussian height — thin core, thicker outer
    const heightScale = radius * (0.02 + rn * 0.08)
    const y = gauss(i, 6) * heightScale

    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r

    // Mild disc tilt applied in group rotation; store flat here
    pos[w * 3] = x
    pos[w * 3 + 1] = y
    pos[w * 3 + 2] = z

    // Color by zone + palette mix
    let paletteIndex
    if (rn < 0.12) {
      paletteIndex = hash(i, 7) < 0.6 ? 0 : 1 // white / warm white
    } else if (rn < 0.35) {
      paletteIndex = 1 + Math.floor(hash(i, 7) * 2) // gold / amber
    } else if (rn < 0.7) {
      paletteIndex = 2 + Math.floor(hash(i, 7) * 2) // amber / orange
    } else {
      paletteIndex = 3 + Math.floor(hash(i, 7) * 2) // orange deep
      if (paletteIndex > 4) paletteIndex = 4
    }
    const c = COLORS[paletteIndex]

    // Brightness: denser core hotter; outer dimmer
    let bright
    if (rn < 0.15) bright = 0.75 + hash(i, 8) * 0.25
    else if (rn < 0.45) bright = 0.4 + hash(i, 8) * 0.35
    else if (rn < 0.85) bright = 0.15 + hash(i, 8) * 0.25
    else bright = 0.04 + hash(i, 8) * 0.08

    col[w * 3] = c.r * bright
    col[w * 3 + 1] = c.g * bright
    col[w * 3 + 2] = c.b * bright
    w++
  }

  return { pos: pos.subarray(0, w * 3), col: col.subarray(0, w * 3), count: w }
}

export default function Galaxy({
  center = { x: 48, y: 0, z: -12 },
  radius = 50,
}) {
  const map = useMemo(() => makeDot(), [])
  // Three size layers: 80% tiny, 15% mid, 5% larger — separate draws
  const layers = useMemo(() => {
    const all = buildGalaxyParticles(radius, 45000)
    // Split by brightness proxy for size tiers
    const tiny = { pos: [], col: [] }
    const mid = { pos: [], col: [] }
    const big = { pos: [], col: [] }
    for (let i = 0; i < all.count; i++) {
      const br =
        all.col[i * 3] * 0.3 + all.col[i * 3 + 1] * 0.5 + all.col[i * 3 + 2] * 0.2
      const roll = hash(i, 99)
      let bucket
      if (roll < 0.8) bucket = tiny
      else if (roll < 0.95) bucket = mid
      else bucket = big
      // Prefer brighter in bigger buckets slightly
      if (br > 0.7 && roll > 0.7) bucket = big
      bucket.pos.push(all.pos[i * 3], all.pos[i * 3 + 1], all.pos[i * 3 + 2])
      bucket.col.push(all.col[i * 3], all.col[i * 3 + 1], all.col[i * 3 + 2])
    }
    const pack = (b) => ({
      pos: new Float32Array(b.pos),
      col: new Float32Array(b.col),
      count: b.pos.length / 3,
    })
    return { tiny: pack(tiny), mid: pack(mid), big: pack(big) }
  }, [radius])

  const Layer = ({ data, size, opacity }) => {
    if (!data.count) return null
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

  return (
    <group position={[center.x, center.y ?? 0, center.z]} rotation={[-0.45, 0.25, 0.3]}>
      <Layer data={layers.tiny} size={0.35} opacity={0.7} />
      <Layer data={layers.mid} size={0.65} opacity={0.8} />
      <Layer data={layers.big} size={1.1} opacity={0.9} />
    </group>
  )
}
