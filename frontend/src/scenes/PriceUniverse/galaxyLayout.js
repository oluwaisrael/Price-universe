

const GALAXY_CENTERS = {
  Jumia: { x: -28, z: 0 },
  Jiji: { x: 28, z: 0 },
}
const DEFAULT_GALAXY_CENTER = { x: 0, z: 0 }

const MIN_HEIGHT = -2.5
const MAX_HEIGHT = 4.5


const GALAXY_RADIUS = 13
const CORE_RADIUS = 0.6
const ARM_COUNT = 2

const SPIRAL_TURNS = 1.35

const ARM_SCATTER = 0.32
const VERTICAL_SCATTER = 0.35 

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

function galaxyCenter(site) {
  return GALAXY_CENTERS[site] ?? DEFAULT_GALAXY_CENTER
}

function priceToHeight(price, minPrice, maxPrice) {
  if (maxPrice <= minPrice) return (MIN_HEIGHT + MAX_HEIGHT) / 2

  const logMin = Math.log(Math.max(minPrice, 1))
  const logMax = Math.log(Math.max(maxPrice, 1))
  const logPrice = Math.log(Math.max(price, 1))

  const t = (logPrice - logMin) / (logMax - logMin)
  return MIN_HEIGHT + t * (MAX_HEIGHT - MIN_HEIGHT)
}


function spiralPosition(id, index) {
  const tRadius = hashToUnit(`${index}-${id}-t`)
  const armPick = Math.floor(hashToUnit(`${index}-${id}-arm`) * ARM_COUNT)
  const armOffset = (armPick / ARM_COUNT) * Math.PI * 2

  
  const radius = CORE_RADIUS + Math.sqrt(tRadius) * (GALAXY_RADIUS - CORE_RADIUS)
  const angle = armOffset + tRadius * SPIRAL_TURNS * Math.PI * 2

  const baseX = Math.cos(angle) * radius
  const baseZ = Math.sin(angle) * radius

  const scatterAmount = ARM_SCATTER * (0.3 + 0.7 * tRadius)
  const perpAngle = angle + Math.PI / 2
  const scatter = (hashToUnit(`${index}-${id}-s`) - 0.5) * 2 * scatterAmount

  const x = baseX + Math.cos(perpAngle) * scatter
  const z = baseZ + Math.sin(perpAngle) * scatter

  const yJitter = (hashToUnit(`${index}-${id}-y`) - 0.5) * 2 * VERTICAL_SCATTER

  return { x, z, yJitter }
}

export function computeGalaxyLayout(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return []

  const prices = nodes.map((n) => n.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  return nodes.map((node, index) => {
    const center = galaxyCenter(node.site)
    const height = priceToHeight(node.price, minPrice, maxPrice)
    const { x, z, yJitter } = spiralPosition(node.id, index)

    return {
      ...node,
      position: [center.x + x, height + yJitter, center.z + z],
    }
  })
}


export function getGalaxyCenters() {
  return GALAXY_CENTERS
}

export function getGalaxyRadius() {
  return GALAXY_RADIUS
}

const FILLER_STARS_PER_ARM = 220
const HAZE_POINTS_PER_GALAXY = 90

export function generateFillerStars() {
  const stars = []

  for (const site of Object.keys(GALAXY_CENTERS)) {
    const center = galaxyCenter(site)

    for (let arm = 0; arm < ARM_COUNT; arm++) {
      const armOffset = (arm / ARM_COUNT) * Math.PI * 2

      for (let i = 0; i < FILLER_STARS_PER_ARM; i++) {
        const seed = `filler-${site}-${arm}-${i}`
        
        const t = i / (FILLER_STARS_PER_ARM - 1)

        const radius = CORE_RADIUS + Math.sqrt(t) * (GALAXY_RADIUS - CORE_RADIUS)
        const angle = armOffset + t * SPIRAL_TURNS * Math.PI * 2

        const baseX = Math.cos(angle) * radius
        const baseZ = Math.sin(angle) * radius

        
        const scatterAmount = ARM_SCATTER * (0.5 + 0.9 * t)
        const perpAngle = angle + Math.PI / 2
        const scatter = (hashToUnit(`${seed}-s`) - 0.5) * 2 * scatterAmount

        const x = baseX + Math.cos(perpAngle) * scatter
        const z = baseZ + Math.sin(perpAngle) * scatter
        const yJitter = (hashToUnit(`${seed}-y`) - 0.5) * 2 * VERTICAL_SCATTER * 0.7

        stars.push({
          key: seed,
          site,
          kind: 'arm',
          position: [center.x + x, yJitter, center.z + z],
          scale: 0.35 + hashToUnit(`${seed}-scale`) * 0.85,
        })
      }
    }
   
    for (let i = 0; i < HAZE_POINTS_PER_GALAXY; i++) {
      const seed = `haze-${site}-${i}`
      const angle = hashToUnit(`${seed}-a`) * Math.PI * 2
      const radius = Math.sqrt(hashToUnit(`${seed}-r`)) * GALAXY_RADIUS * 1.3
      const height = (hashToUnit(`${seed}-y`) - 0.5) * 2 * VERTICAL_SCATTER * 1.8

      stars.push({
        key: seed,
        site,
        kind: 'haze',
        position: [
          center.x + Math.cos(angle) * radius,
          height,
          center.z + Math.sin(angle) * radius,
        ],
        scale: 0.6 + hashToUnit(`${seed}-scale`) * 1.4,
      })
    }
  }

  return stars
}


export function getGalaxyDisplayOrder() {
  return Object.keys(GALAXY_CENTERS)
}
