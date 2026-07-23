/**
 * Galaxy Layout Engine — Phase 2 of PriceUniverse.
 *
 * Scale note: constants below were increased ~5x from the original
 * pass (centers, spread, height range) so the two galaxies read as
 * distinct regions in a large navigable space rather than a small
 * cluster near the origin. NODE_RADIUS/BILLBOARD_MAX_DIM/camera
 * distances in ProductNode/ProductImage/CameraRig were scaled to
 * match — this file's numbers only make sense alongside those.
 *
 * Visual pass: nodes are placed on a two-armed logarithmic spiral
 * around each galaxy's center (classic "spiral galaxy" silhouette)
 * instead of scattered randomly in a disc. Distance-from-center,
 * angle-along-arm, and vertical scatter are all still deterministic
 * per-node (hashToUnit(node.id)), so layout is stable across
 * re-renders and re-fetches — same node always lands in the same
 * spot. Only the *shape* of the distribution changed; price still
 * drives height (y) exactly as before.
 */

// Hero composition pass: both galaxies shifted right and apart so the
// left ~30-35% of the viewport (where headline/search/nav live) stays
// visually clear. Jumia moved from a symmetric -28 to a modest +6 —
// still left-of-center relative to Jiji, but no longer sitting under
// the text column. Jiji pushed further right (52, up from 28) and
// back in z (-18) so it reads as more distant, adding depth and
// letting it partially extend off the right edge of the viewport
// rather than sitting fully centered, matching the reference's
// "galaxies breathe, don't feel boxed-in" framing. These numbers are
// paired with CameraRig's DEFAULT_CAMERA_POSITION/target offset —
// changing one without the other will throw off the composition.
// Centers widened proportionally to the GALAXY_RADIUS increase
// (18->26, ~45%) — the previous gap (56.9 units apart) was sized for
// radius-18 galaxies and would let the larger galaxies' haze/arms
// overlap in the middle. New spacing keeps the same relative gap.
const GALAXY_CENTERS = {
  // Nudged +6x/-4z from (14,-9) — a small shift to ease Jumia's outer
  // ring overlapping the hero text/search bar, without moving the
  // whole camera again (a full pan previously overcorrected badly).
  Jumia: { x: 20, z: -13 },
  Jiji: { x: 92, z: -34 },
}
const DEFAULT_GALAXY_CENTER = { x: 0, z: 0 }

const MIN_HEIGHT = -2.5
const MAX_HEIGHT = 4.5

// Radius increased 18 -> 26 (~45%) to make galaxies read as dominant,
// frame-filling elements per the reference mockup rather than small
// floating clusters. FILLER_STARS_PER_ARM and HAZE_POINTS_PER_GALAXY
// below are scaled up in proportion so density-per-unit-area stays
// constant — a bigger radius alone would just spread the same star
// count thinner and look emptier, the opposite of the goal.
const GALAXY_RADIUS = 26
const CORE_RADIUS = 0.6
// Matches VISUAL_ARM_COUNT (below) so real product nodes sit on the
// same arms the dust particles trace — previously this was 2 while
// dust used 5, meaning products only ever emerged from 2 of the 5
// visible arms instead of naturally distributing across all of them.
const ARM_COUNT = 5
// Visual-only arm count for the decorative dust bands, decoupled from
// ARM_COUNT above (which must stay 2 — real product positions in
// spiralPosition() depend on it, and changing it would reshuffle
// every product's arm assignment). 5 dust arms gives the galaxy a
// dense multi-arm spiral look while only 2 of those arms carry actual
// products, matching how real barred/multi-arm spirals aren't
// uniformly populated across every arm.
const VISUAL_ARM_COUNT = 5
// Increased from 1.35 to 2.1 — at the scene's fairly shallow camera
// pitch, 1.35 turns read mostly as radial scatter/a fan rather than a
// visible curved arm. More winding makes the pinwheel shape legible
// from this angle while staying under 2.5 turns so the two arms don't
// start visually overlapping into a solid ring.
const SPIRAL_TURNS = 2.1
// Narrower band off the arm centerline — 0.5 was wide enough that
// filler stars smeared across neighboring arms instead of tracing a
// crisp line.
const ARM_SCATTER = 0.32
const VERTICAL_SCATTER = 0.35 // small y-jitter so the disc isn't perfectly flat

// The default camera sits at a shallow ~15° pitch (see CameraRig's
// DEFAULT_CAMERA_POSITION, y=16 over a ~58-unit radius) and per user
// instruction the camera itself must not change. A perfectly flat
// XZ-plane disc viewed at that pitch squashes to a thin edge-on band
// (a "ring"), which is why the spiral wasn't reading despite correct
// arm math — it's a geometry-vs-viewing-angle mismatch, not a density
// problem.
//
// Fix: geometrically tilt the disc itself in world space by rotating
// each point around the local X-axis before offsetting by the galaxy
// center. This is baked into actual (x, y, z) coordinates — not a
// scene-graph rotation on a wrapper group — so it composes correctly
// with everything downstream that reads raw positions: click
// raycasting, node.position in DetailPanel, CameraRig's fly-to offset
// math. Real node positions (spiralPosition, used for actual product
// nodes) intentionally do NOT get this tilt, since ProductNode click
// targets should stay exactly where their price-driven height (y)
// places them — only the purely decorative filler stars / haze /
// core / rings get tilted, which is enough to sell the spiral shape.
const DISC_TILT_RAD = (58 * Math.PI) / 180

function tiltDiscPoint(x, y, z) {
  const cos = Math.cos(DISC_TILT_RAD)
  const sin = Math.sin(DISC_TILT_RAD)
  return {
    x,
    y: y * cos - z * sin,
    z: y * sin + z * cos,
  }
}

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

/**
 * Places a node on a logarithmic spiral: radius grows smoothly from
 * CORE_RADIUS to GALAXY_RADIUS as t (0–1, hashed from the node id)
 * increases, while the angle winds SPIRAL_TURNS times around. Nodes
 * are split evenly across ARM_COUNT arms (each arm offset by an even
 * fraction of a full turn), then given small perpendicular + radial
 * scatter so the arm reads as a dense band of stars rather than a
 * single perfect line.
 *
 * `index` (position within that site's node array) is folded into
 * every hash salt alongside `id`. Real scraped URLs can share long
 * substrings within a batch (tracking params, session ids), which
 * biased the hash output when `id` alone was hashed — folding in a
 * plain incrementing index guarantees clean, even spread regardless
 * of any structure in the underlying id string.
 */
function spiralPosition(id, index, total = 1) {
  // Blend the random hash with a deterministic index-based spread.
  // With hundreds of real nodes the hash alone averages out to a
  // proper sqrt-biased density falloff, but a small sample (e.g.
  // Jumia's 11 products) can land mostly inward purely by chance —
  // there's no law of large numbers to smooth it out. Folding in a
  // small deterministic component (index/total, evenly covering 0-1)
  // guarantees low-count galaxies still reach the outer radius, while
  // barely perturbing high-count galaxies where the hash already
  // averages correctly.
  const hashT = hashToUnit(`${index}-${id}-t`)
  const evenT = total > 1 ? index / (total - 1) : hashT
  const spreadWeight = Math.max(0, 1 - total / 40) // fades out by ~40 nodes
  const tRadius = hashT * (1 - spreadWeight) + evenT * spreadWeight

  const armPick = Math.floor(hashToUnit(`${index}-${id}-arm`) * ARM_COUNT)
  const armOffset = (armPick / ARM_COUNT) * Math.PI * 2

  // sqrt bias keeps density high near the core and thins toward the
  // rim, matching real spiral galaxies' brightness falloff.
  const radius = CORE_RADIUS + Math.sqrt(tRadius) * (GALAXY_RADIUS - CORE_RADIUS)
  const angle = armOffset + tRadius * SPIRAL_TURNS * Math.PI * 2

  const baseX = Math.cos(angle) * radius
  const baseZ = Math.sin(angle) * radius

  // Perpendicular scatter (across the arm) shrinks near the core so
  // the center reads as a tight, bright cluster rather than a blob.
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

  const siteCounts = nodes.reduce((acc, n) => {
    acc[n.site] = (acc[n.site] ?? 0) + 1
    return acc
  }, {})
  const siteRunningIndex = {}

  return nodes.map((node) => {
    const center = galaxyCenter(node.site)
    const height = priceToHeight(node.price, minPrice, maxPrice)
    const siteIndex = siteRunningIndex[node.site] ?? 0
    siteRunningIndex[node.site] = siteIndex + 1
    const { x, z, yJitter } = spiralPosition(node.id, siteIndex, siteCounts[node.site])

    // Same log-normalization as priceToHeight, exposed as a plain 0..1
    // scalar (not remapped into MIN_HEIGHT..MAX_HEIGHT) so the
    // rendering layer (ProductNode/ProductImage) can use it for
    // non-position visuals like card size without re-deriving the
    // math or importing MIN_HEIGHT/MAX_HEIGHT constants it has no use
    // for otherwise.
    const priceScale =
      maxPrice <= minPrice
        ? 0.5
        : (Math.log(Math.max(node.price, 1)) - Math.log(Math.max(minPrice, 1))) /
          (Math.log(Math.max(maxPrice, 1)) - Math.log(Math.max(minPrice, 1)))

    return {
      ...node,
      position: [center.x + x, height + yJitter, center.z + z],
      priceScale,
    }
  })
}

// Exposed for the scene layer to render each galaxy's emissive core
// at the same centers this file uses, without duplicating the
// GALAXY_CENTERS constant.
export function getGalaxyCenters() {
  return GALAXY_CENTERS
}

export function getGalaxyRadius() {
  return GALAXY_RADIUS
}

// Exposed so orbit rings / nebula sprites (flat geometry, unlike the
// point-cloud stars which get tilted per-point above) can rotate to
// match the disc's inclination and look like part of the same tilted
// galaxy rather than a flat ring floating in front of it.
export function getDiscTiltRadians() {
  return DISC_TILT_RAD
}

/**
 * Generates a dense field of purely decorative "filler" star
 * positions tracing a clean two-armed spiral per galaxy. With only
 * ~15-66 real products, the arm shape is too sparse to read visually
 * on its own — real spiral galaxy imagery (and the design mockup)
 * implies hundreds of points along a continuous curve.
 *
 * Unlike spiralPosition() (used for real product nodes, where each
 * node's radius is picked independently via hash so nodes don't
 * cluster predictably), filler stars are walked SEQUENTIALLY along
 * each arm by index — t = i / count, not a random hash. Random
 * per-star radii spread evenly across the whole disc read as a
 * uniform blob; sequential sampling is what actually traces a
 * visible curved line. Small hashed jitter is layered on top only to
 * keep the line from looking mechanically perfect.
 */
const FILLER_STARS_PER_ARM = 950
const HAZE_POINTS_PER_GALAXY = 260

// Depth (perpendicular-to-disc) variance for filler stars — small
// additional jitter along the disc's local "thickness" axis so the
// spiral reads as a slightly puffy 3D band rather than a perfectly
// flat painted plane once tilted. Applied post-tilt, in the same
// local space as VERTICAL_SCATTER, so it doesn't disturb the tilt
// math above.
const DEPTH_VARIANCE = 0.22

// Orbiting "satellite" markers — small bright points that trace clean
// circular orbits around the core at a few fixed radii, independent
// of the spiral arm stars. This is what makes the galaxy read as a
// "miniature solar system" rather than only a flat spiral: concentric
// rings of motion around a bright center. Purely decorative (no
// raycasting) — animated client-side in GalaxyOrbitSatellites.jsx by
// walking `angle0 + t * speed`, not baked into a static position here.
const SATELLITE_RINGS = [
  { radiusFraction: 0.35, count: 3, speed: 0.12, size: 0.22 },
  { radiusFraction: 0.6, count: 4, speed: -0.08, size: 0.16 },
  { radiusFraction: 0.85, count: 5, speed: 0.05, size: 0.12 },
]

export function getSatelliteConfig() {
  return SATELLITE_RINGS
}

export function generateFillerStars() {
  const stars = []

  for (const site of Object.keys(GALAXY_CENTERS)) {
    const center = galaxyCenter(site)

    for (let arm = 0; arm < VISUAL_ARM_COUNT; arm++) {
      const armOffset = (arm / VISUAL_ARM_COUNT) * Math.PI * 2

      for (let i = 0; i < FILLER_STARS_PER_ARM; i++) {
        const seed = `filler-${site}-${arm}-${i}`
        // Sequential t (0→1 along the arm), NOT hashed — this is what
        // makes the arm trace a continuous curve instead of scatter.
        const t = i / (FILLER_STARS_PER_ARM - 1)

        const radius = CORE_RADIUS + Math.sqrt(t) * (GALAXY_RADIUS - CORE_RADIUS)
        const angle = armOffset + t * SPIRAL_TURNS * Math.PI * 2

        const baseX = Math.cos(angle) * radius
        const baseZ = Math.sin(angle) * radius

        // Tight perpendicular jitter only — keeps stars ON the arm
        // line rather than smeared across the whole disc. Scatter
        // width narrows near the core, widens slightly toward the rim.
        const scatterAmount = ARM_SCATTER * (0.5 + 0.9 * t)
        const perpAngle = angle + Math.PI / 2
        const scatter = (hashToUnit(`${seed}-s`) - 0.5) * 2 * scatterAmount

        const x = baseX + Math.cos(perpAngle) * scatter
        const z = baseZ + Math.sin(perpAngle) * scatter
        const yJitter = (hashToUnit(`${seed}-y`) - 0.5) * 2 * VERTICAL_SCATTER * 0.7

        const tilted = tiltDiscPoint(x, yJitter, z)
        // Small extra depth jitter applied after tilting, in world Y —
        // keeps the band from looking like a flat painted plane once
        // viewed at the disc's inclination.
        const depthJitter = (hashToUnit(`${seed}-depth`) - 0.5) * 2 * DEPTH_VARIANCE

        // Density/brightness bulge — peaks around mid-arm (t≈0.45) and
        // tapers toward both the tight core and the sparse outer rim,
        // instead of uniform density along the whole length. Combined
        // with a random per-particle "included" roll below, this is
        // what produces the varying-density banded look rather than
        // an evenly-painted line.
        const densityBulge = Math.sin(t * Math.PI * 0.9 + 0.15) * 0.5 + 0.5
        const included = hashToUnit(`${seed}-keep`) < 0.35 + densityBulge * 0.65
        if (!included) continue

        stars.push({
          key: seed,
          site,
          kind: 'arm',
          position: [center.x + tilted.x, tilted.y + depthJitter, center.z + tilted.z],
          scale: (0.3 + hashToUnit(`${seed}-scale`) * 0.8) * (0.6 + densityBulge * 0.7),
        })
      }
    }

    // Soft nebula haze: a looser, more randomly-scattered halo around
    // the whole galaxy (radius up to ~1.3x GALAXY_RADIUS), sparse and
    // very dim — reads as atmospheric cloud rather than distinct
    // stars, matching the soft glow around each galaxy in the design
    // reference. Genuinely random placement is correct here (unlike
    // the arm stars above) since a nebula has no linear structure.
    for (let i = 0; i < HAZE_POINTS_PER_GALAXY; i++) {
      const seed = `haze-${site}-${i}`
      const angle = hashToUnit(`${seed}-a`) * Math.PI * 2
      const radius = Math.sqrt(hashToUnit(`${seed}-r`)) * GALAXY_RADIUS * 1.3
      const height = (hashToUnit(`${seed}-y`) - 0.5) * 2 * VERTICAL_SCATTER * 1.8

      const hazeTilted = tiltDiscPoint(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      )

      stars.push({
        key: seed,
        site,
        kind: 'haze',
        position: [
          center.x + hazeTilted.x,
          hazeTilted.y,
          center.z + hazeTilted.z,
        ],
        scale: 0.6 + hashToUnit(`${seed}-scale`) * 1.4,
      })
    }
  }

  return stars
}

// Metadata for the galaxy name/count labels rendered in the scene
// (panel 01 in the design reference: "JUMIA GALAXY — 48 products").
// Counts are populated by the caller from real fetched data — this
// just declares which sites get labels and in what display order.
export function getGalaxyDisplayOrder() {
  return Object.keys(GALAXY_CENTERS)
}
