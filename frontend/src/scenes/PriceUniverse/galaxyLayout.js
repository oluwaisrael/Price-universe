/**
 * Galaxy Layout — cinematic product-art architecture (not science sim).
 *
 * Design goals (art director):
 *  - Readable spiral silhouette (2–4 arms, clear gaps)
 *  - Bright compact nucleus
 *  - Products embedded ON arms, never random cloud
 *  - Layered depth (core / arm ridge / arm cloud / inter-arm / halo)
 *  - ~20k particles total budget across both galaxies
 *
 * Math (per particle / product):
 *  Logarithmic spiral:
 *    r(t) = r0 + (R - r0) * t^γ
 *    θ(t) = θ_arm + k * ln(r / r0)
 *  Distance to arm centerline drives density via Gaussian mixture:
 *    ridge  N(0, σ_r)  — bright spine
 *    cloud  N(0, σ_c)  — thick shoulder (most mass)
 *    fringe N(0, σ_f)  — soft edge
 *  Radial profile: core boost * (1 - smoothstep rim)
 */

// ─── Scene placement (hero text clears left column) ──────────────────────────
const GALAXY_CENTERS = {
  Jumia: { x: 168, z: -30 },
  Jiji:  { x: 132, z: -4 },
}
const DEFAULT_GALAXY_CENTER = { x: 0, z: 0 }

const MIN_HEIGHT = -2.0
const MAX_HEIGHT = 3.5

// Silhouette — compact multi-arm like the mockup
const GALAXY_RADIUS = 64
// Match Galaxy.jsx particle spiral: r0 = R*0.07, rMax = R*1.05
const CORE_RADIUS = GALAXY_RADIUS * 0.07
const ARM_COUNT = 6
const SPIRAL_TURNS = 1.15
const SPIRAL_PITCH = -(SPIRAL_TURNS * Math.PI * 2) / Math.log(1.05 / 0.07)

// Arm thickness (world units) — scaled to compact radius
const SIGMA_RIDGE = 0.4
const SIGMA_CLOUD = 1.8
const SIGMA_FRINGE = 3.2
// Products sit tightly on the arm ridge
const SIGMA_PRODUCT = 1.1

// Particle budget (~20k total for both galaxies)
const ARM_RIDGE_PER_ARM = 220
const ARM_CLOUD_PER_ARM = 1100
const INTERARM_PER_GALAXY = 450
const CORE_POINTS_PER_GALAXY = 900
const HALO_PER_GALAXY = 600

// Match Galaxy.jsx group rotation={[-0.55, 0.12, 0.1]} so products sit on arms
const GALAXY_ROT_X = -0.55
const GALAXY_ROT_Y = 0.12
const GALAXY_ROT_Z = 0.1
const VERTICAL_ARM = 0.9
const VERTICAL_CORE = 0.7

// ─── Deterministic hash ──────────────────────────────────────────────────────
function hashToUnit(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}

function gaussianFromSeed(seed) {
  const u1 = Math.max(hashToUnit(`${seed}-g1`), 1e-6)
  const u2 = hashToUnit(`${seed}-g2`)
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function galaxyCenter(site) {
  return GALAXY_CENTERS[site] ?? DEFAULT_GALAXY_CENTER
}

/** Apply same Euler XYZ rotation as Galaxy mesh group */
function tiltDiscPoint(x, y, z) {
  // Rz
  let cos = Math.cos(GALAXY_ROT_Z), sin = Math.sin(GALAXY_ROT_Z)
  let x1 = x * cos - y * sin
  let y1 = x * sin + y * cos
  let z1 = z
  // Ry
  cos = Math.cos(GALAXY_ROT_Y); sin = Math.sin(GALAXY_ROT_Y)
  let x2 = x1 * cos + z1 * sin
  let y2 = y1
  let z2 = -x1 * sin + z1 * cos
  // Rx
  cos = Math.cos(GALAXY_ROT_X); sin = Math.sin(GALAXY_ROT_X)
  return {
    x: x2,
    y: y2 * cos - z2 * sin,
    z: y2 * sin + z2 * cos,
  }
}

/**
 * Sample a point on a logarithmic spiral arm.
 * layer: 'ridge' | 'cloud' | 'fringe' | 'product'
 */
function sampleArmPoint(site, armIndex, t, seed, layer = 'cloud') {
  // Exact same phase as Galaxy.jsx: (arm/N)*2π + (hash(arm)-0.5)*0.1
  const armJitter = (hashToUnit(`garm-${armIndex}`) - 0.5) * 0.1
  const armOffset = (armIndex / ARM_COUNT) * Math.PI * 2 + armJitter

  // Match Galaxy particle radial mapping (near-linear t → r)
  const gamma = layer === 'product' ? 1.0 : layer === 'ridge' ? 0.85 : 0.75
  const rMax = GALAXY_RADIUS * 1.05
  const radius = CORE_RADIUS + Math.pow(Math.max(t, 1e-4), gamma) * (rMax - CORE_RADIUS)
  const theta = armOffset + SPIRAL_PITCH * Math.log(Math.max(radius, CORE_RADIUS * 1.01) / CORE_RADIUS)

  // Gaussian mixture width by layer
  let sigma = SIGMA_CLOUD
  if (layer === 'ridge') sigma = SIGMA_RIDGE
  else if (layer === 'fringe') sigma = SIGMA_FRINGE
  else if (layer === 'product') sigma = SIGMA_PRODUCT

  // Arms thicken slightly with radius; products stay tight
  sigma *= layer === 'product' ? (0.85 + 0.2 * t) : (0.75 + 0.55 * t)

  const g = gaussianFromSeed(seed)
  const perp = g * sigma
  const radialNudge = (hashToUnit(`${seed}-rn`) - 0.5) * sigma * 0.35

  const r = radius + radialNudge
  const baseX = Math.cos(theta) * r
  const baseZ = Math.sin(theta) * r
  const px = -Math.sin(theta) // perpendicular in XZ
  const pz = Math.cos(theta)

  const x = baseX + px * perp
  const z = baseZ + pz * perp
  // Products: flat disc coords (tilt comes from parent Galaxy group rotation)
  // Other layers: apply tilt for any world-space fillers
  const yMul = layer === 'product' ? 1.4 : layer === 'ridge' ? 0.35 : 0.7
  const y = gaussianFromSeed(`${seed}-y`) * VERTICAL_ARM * yMul

  if (layer === 'product') return { x, y, z }
  return tiltDiscPoint(x, y, z)
}

// ─── Product placement: ON arms, avoid core, soft clusters ───────────────────
function spiralPosition(id, index, total = 1) {
  // Even coverage along arms when few products; hash when many
  const hashT = hashToUnit(`${index}-${id}-t`)
  const evenT = total > 1 ? index / Math.max(total - 1, 1) : hashT
  const w = Math.max(0, 1 - total / 50)
  let t = hashT * (1 - w) + evenT * w
  // Keep products out of the blinding core
  t = 0.14 + t * 0.82

  const armPick = Math.floor(hashToUnit(`${index}-${id}-arm`) * ARM_COUNT) % ARM_COUNT

  // Stronger clustering + sparse gaps (organic, not uniform)
  const groupId = Math.floor(index / 4)
  const groupT = (hashToUnit(`${id}-grp-${groupId}-t`) - 0.5) * 0.1
  const clusterNudge = (hashToUnit(`${id}-cl-${index}`) - 0.5) * 0.04
  // Bias some products into dense mid-arm bands, leave gaps near 0.4 and 0.7
  const band = hashToUnit(`${id}-band`)
  if (band < 0.35) t = 0.18 + hashToUnit(`${id}-b1`) * 0.22
  else if (band < 0.7) t = 0.45 + hashToUnit(`${id}-b2`) * 0.2
  else t = 0.72 + hashToUnit(`${id}-b3`) * 0.2
  t = Math.min(0.96, Math.max(0.14, t + groupT + clusterNudge))

  const local = sampleArmPoint('prod', armPick, t, `${index}-${id}`, 'product')
  // Extra radial drift: push some inside / outside the arm lane
  const drift = (hashToUnit(`${id}-drift`) - 0.5) * 2.4
  const ang = Math.atan2(local.z, local.x)
  return {
    x: local.x + Math.cos(ang) * drift,
    y: local.y,
    z: local.z + Math.sin(ang) * drift,
  }
}

export function computeGalaxyLayout(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return []

  const prices = nodes.map((n) => n.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  const siteCounts = nodes.reduce((acc, n) => {
    acc[n.site] = (acc[n.site] ?? 0) + 1
    return acc
  }, {})
  const siteRunningIndex = {}

  return nodes.map((node) => {
    const center = galaxyCenter(node.site)
    const siteIndex = siteRunningIndex[node.site] ?? 0
    siteRunningIndex[node.site] = siteIndex + 1
    const { x, y, z } = spiralPosition(node.id, siteIndex, siteCounts[node.site])

    const priceScale =
      maxPrice > minPrice ? (node.price - minPrice) / (maxPrice - minPrice) : 0.5

    // Wide size tiers for depth (tiny / medium / large / hero)
    const sizeRoll = hashToUnit(`${node.id}-visscale`)
    let visualScale
    if (sizeRoll < 0.35) {
      visualScale = 0.45 + priceScale * 0.15 + hashToUnit(`${node.id}-sv`) * 0.1
    } else if (sizeRoll < 0.7) {
      visualScale = 0.85 + priceScale * 0.25 + hashToUnit(`${node.id}-sv`) * 0.15
    } else if (sizeRoll < 0.9) {
      visualScale = 1.25 + priceScale * 0.35 + hashToUnit(`${node.id}-sv`) * 0.2
    } else {
      visualScale = 1.7 + priceScale * 0.4 + hashToUnit(`${node.id}-sv`) * 0.3
    }

    // Mild price height — secondary to arm embedding
    // Tiny height variation only — keep cards on the arm plane
    const priceNudge = (priceScale - 0.5) * 0.6

    // localPosition = coords inside the rotating Galaxy group (planets on arms)
    // Jiji galaxy is scaled 0.78x — scale local arm coords to match
    const siteScale = 1
    const yOffset = node.site === 'Jiji' ? 8 : -20
    const lx = x * siteScale
    const ly = (y + priceNudge) * siteScale
    const lz = z * siteScale

    return {
      ...node,
      localPosition: [lx, ly, lz],
      position: [center.x + lx, ly + yOffset, center.z + lz],
      visualScale,
      site: node.site,
    }
  })
}

export function getGalaxyCenters() {
  return GALAXY_CENTERS
}

export function getGalaxyRadius() {
  return GALAXY_RADIUS
}

export function getDiscTiltRadians() {
  return DISC_TILT_RAD
}

const SATELLITE_RINGS = [
  { radiusMult: 1.15, count: 3, speed: 0.04 },
  { radiusMult: 1.35, count: 2, speed: -0.03 },
]
export function getSatelliteConfig() {
  return SATELLITE_RINGS
}

/**
 * Layered particle system:
 *  kind: 'ridge' | 'cloud' | 'interarm' | 'halo'
 * ~20k points total for both sites.
 */
export function generateFillerStars() {
  const stars = []

  for (const site of Object.keys(GALAXY_CENTERS)) {
    const center = galaxyCenter(site)

    for (let arm = 0; arm < ARM_COUNT; arm++) {
      // Bright ridge (silhouette spine)
      for (let i = 0; i < ARM_RIDGE_PER_ARM; i++) {
        const seed = `ridge-${site}-${arm}-${i}`
        const t = i / (ARM_RIDGE_PER_ARM - 1)
        // Soft gaps along arm for organic breaks
        const gap = Math.abs(Math.sin(t * Math.PI * 3.2 + arm)) < 0.12 && hashToUnit(`${seed}-gap`) < 0.5
        if (gap) continue
        const p = sampleArmPoint(site, arm, t, seed, 'ridge')
        // Density higher mid-arm
        const bulge = Math.sin(t * Math.PI) * 0.5 + 0.5
        stars.push({
          key: seed,
          site,
          kind: 'ridge',
          position: [center.x + p.x, p.y, center.z + p.z],
          scale: (0.35 + bulge * 0.55) * (0.7 + hashToUnit(`${seed}-s`) * 0.6),
        })
      }

      // Thick cloud (bulk of arm mass — makes arms look solid)
      for (let i = 0; i < ARM_CLOUD_PER_ARM; i++) {
        const seed = `cloud-${site}-${arm}-${i}`
        const t = Math.pow(hashToUnit(`${seed}-t`), 0.75)
        const p = sampleArmPoint(site, arm, t, seed, 'cloud')
        const bulge = Math.sin(t * Math.PI * 0.95 + 0.1) * 0.5 + 0.5
        if (hashToUnit(`${seed}-keep`) > 0.35 + bulge * 0.6) continue
        stars.push({
          key: seed,
          site,
          kind: 'cloud',
          position: [center.x + p.x, p.y, center.z + p.z],
          scale: (0.2 + bulge * 0.35) * (0.6 + hashToUnit(`${seed}-s`) * 0.5),
        })
      }
    }

    // Sparse inter-arm dust — fills volume without erasing gaps
    for (let i = 0; i < INTERARM_PER_GALAXY; i++) {
      const seed = `inter-${site}-${i}`
      const angle = hashToUnit(`${seed}-a`) * Math.PI * 2
      const rt = Math.pow(hashToUnit(`${seed}-r`), 0.9)
      const radius = CORE_RADIUS + rt * (GALAXY_RADIUS - CORE_RADIUS)
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = (hashToUnit(`${seed}-y`) - 0.5) * 2 * VERTICAL_ARM * 0.7
      const tilted = tiltDiscPoint(x, y, z)
      stars.push({
        key: seed,
        site,
        kind: 'interarm',
        position: [center.x + tilted.x, tilted.y, center.z + tilted.z],
        scale: 0.12 + hashToUnit(`${seed}-s`) * 0.18,
      })
    }

    // Outer halo — dissolves silhouette into space
    for (let i = 0; i < HALO_PER_GALAXY; i++) {
      const seed = `halo-${site}-${i}`
      const angle = hashToUnit(`${seed}-a`) * Math.PI * 2
      const radius = GALAXY_RADIUS * (1.05 + hashToUnit(`${seed}-r`) * 0.7)
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = (hashToUnit(`${seed}-y`) - 0.5) * 2 * VERTICAL_ARM * 1.2
      const tilted = tiltDiscPoint(x, y, z)
      stars.push({
        key: seed,
        site,
        kind: 'halo',
        position: [center.x + tilted.x, tilted.y, center.z + tilted.z],
        scale: 0.1 + hashToUnit(`${seed}-s`) * 0.2,
      })
    }
  }

  return stars
}

export function generateCoreDust() {
  const dust = []
  for (const site of Object.keys(GALAXY_CENTERS)) {
    const center = galaxyCenter(site)
    for (let i = 0; i < CORE_POINTS_PER_GALAXY; i++) {
      const seed = `core-${site}-${i}`
      // 3D Gaussian blob at nucleus
      const gx = gaussianFromSeed(`${seed}-x`) * CORE_RADIUS * 2.2
      const gy = gaussianFromSeed(`${seed}-y`) * VERTICAL_CORE * 0.5
      const gz = gaussianFromSeed(`${seed}-z`) * CORE_RADIUS * 2.2
      const tilted = tiltDiscPoint(gx, gy, gz)
      dust.push({
        key: seed,
        site,
        position: [center.x + tilted.x, tilted.y, center.z + tilted.z],
        scale: 0.4 + hashToUnit(`${seed}-s`) * 0.8,
      })
    }
  }
  return dust
}

export function getGalaxyDisplayOrder() {
  return Object.keys(GALAXY_CENTERS)
}
