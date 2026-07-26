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
const ARM_COUNT = 6
// Visual-only arm count for the decorative dust bands. Kept equal to
// ARM_COUNT (both 6 now) so real product nodes and dust trace the
// same 6 arms — bumped from 5 to 6 for a slightly denser, more
// classic grand-design spiral silhouette.
const VISUAL_ARM_COUNT = 6
// Increased from 1.35 to 2.1 — at the scene's fairly shallow camera
// pitch, 1.35 turns read mostly as radial scatter/a fan rather than a
// visible curved arm. More winding makes the pinwheel shape legible
// from this angle while staying under 2.5 turns so the two arms don't
// start visually overlapping into a solid ring.
// Reduced from 2.1 to 0.85 — at 5 arms, 2.1 full turns meant each arm
// wound through 756°, repeatedly looping back near other arms'
// paths and reading as concentric rings/bands rather than a
// diverging spiral (confirmed by screenshot: dots still traced
// visible ring shapes even after switching from lines to particles).
// Real spiral galaxies read clearly around 0.5-1.2 turns; 0.85 keeps
// visible curvature while letting arms separate cleanly as radius
// grows, instead of overlapping.
const SPIRAL_TURNS = 0.85
// Narrower band off the arm centerline — 0.5 was wide enough that
// filler stars smeared across neighboring arms instead of tracing a
// crisp line.
// Widened from 0.42 — the previous value was tuned for hard 1px dots
// where a tight line still reads as "an arm." Once rendered as soft
// glow sprites (larger, blended, semi-transparent), a scatter that
// narrow left visible dark seams between arms; this width lets
// neighboring sprites overlap into one continuous luminous band.
const ARM_SCATTER = 0.68
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

  const logProgress = Math.log(radius / CORE_RADIUS) / Math.log(GALAXY_RADIUS / CORE_RADIUS)

  // Local clustering: products with nearby indices get a shared group
  // offset that pulls them toward the same region. Groups of ~4-7
  // products will naturally cluster together in dense star regions
  // rather than being evenly spaced around the arms. The group offset
  // is hashed from the group ID, not the individual index, so all
  // members of a group share the same bias vector.
  const groupSize = 5
  const groupId = Math.floor(index / groupSize)
  const groupAngleBias = (hashToUnit(`${id}-grp-${groupId}-a`) - 0.5) * 1.4
  const groupRadialBias = (hashToUnit(`${id}-grp-${groupId}-r`) - 0.5) * GALAXY_RADIUS * 0.12

  // Individual angular jitter ON TOP of the group bias — members
  // within the same group spread slightly around their shared anchor
  // so the cluster feels organic, not stacked on a single point.
  const angleJitter = (hashToUnit(`${index}-${id}-angjit`) - 0.5) * 1.1
  const angle = armOffset + logProgress * SPIRAL_TURNS * Math.PI * 2 + groupAngleBias + angleJitter

  const baseX = Math.cos(angle) * (radius + groupRadialBias)
  const baseZ = Math.sin(angle) * (radius + groupRadialBias)

  // Wide Gaussian scatter so products spread naturally through the
  // galaxy volume — not on a single arm spline. Overlap allowed:
  // the scatterAmount is intentionally large enough that products
  // from adjacent arms can land near each other, exactly like stars
  // embedded in an arm's local volume rather than evenly attached
  // to a visible curve.
  const productGaussian = gaussianFromSeed(`${index}-${id}-pscatter`)
  const scatterAmount = ARM_SCATTER * (1.8 + 2.8 * tRadius)
  const perpAngle = angle + Math.PI / 2
  const scatter = productGaussian * scatterAmount * 0.65

  // Larger radial jitter than previous pass — products can land
  // noticeably inside or outside their nominal arm radius, which is
  // what breaks the "products attached to the arm spline" look.
  const radialJitter = (hashToUnit(`${index}-${id}-rjit`) - 0.5) * 2 * (GALAXY_RADIUS * 0.07)

  const x = baseX + Math.cos(perpAngle) * scatter + Math.cos(angle) * radialJitter
  const z = baseZ + Math.sin(perpAngle) * scatter + Math.sin(angle) * radialJitter

  // Aggressive Z (disc-thickness) depth for 3D embeddedness — products
  // should feel scattered through the disc volume, some partially
  // behind bloom/dust. 3.5× VERTICAL_SCATTER (was 2.6×) pushes more
  // products clearly above/below the disc midplane so they visually
  // layer with the surrounding stars instead of all sitting on one plane.
  const localDepthJitter = (hashToUnit(`${index}-${id}-y`) - 0.5) * 2 * VERTICAL_SCATTER * 3.5

  const tilted = tiltDiscPoint(x, localDepthJitter, z)

  return { x: tilted.x, y: tilted.y, z: tilted.z }
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

    // Same log-normalization as before, exposed as a plain 0..1
    // scalar for card sizing (ProductImage's price-driven scale).
    const priceScale =
      maxPrice <= minPrice
        ? 0.5
        : (Math.log(Math.max(node.price, 1)) - Math.log(Math.max(minPrice, 1))) /
          (Math.log(Math.max(maxPrice, 1)) - Math.log(Math.max(minPrice, 1)))

    // Wide-range visual scale multiplier — combines price tier with a
    // random component so products vary dramatically in apparent size.
    // priceScale alone clusters everything near the middle (0.4–0.7)
    // when the price spread is modest; this explicit tiered roll
    // guarantees some products are 2× bigger than others, which is
    // what makes the galaxy look inhabited by varied-prominence
    // objects rather than a grid of same-size cards.
    const sizeRoll = hashToUnit(`${node.id}-visscale`)
    let visualScale
    if (sizeRoll < 0.55) {
      // Small — majority of products
      visualScale = 0.55 + priceScale * 0.2 + hashToUnit(`${node.id}-sv`) * 0.15
    } else if (sizeRoll < 0.85) {
      // Medium
      visualScale = 0.85 + priceScale * 0.3 + hashToUnit(`${node.id}-sv`) * 0.2
    } else {
      // Large accent — rare, clearly stands out
      visualScale = 1.3 + priceScale * 0.5 + hashToUnit(`${node.id}-sv`) * 0.3
    }

    // Price now contributes only a SMALL secondary vertical nudge on
    // top of the tilted-disc position — enough that pricier products
    // still drift subtly "higher" in the arm's local volume, without
    // overriding the disc geometry and flattening every product onto
    // one horizontal plane like the old priceToHeight()-dominated
    // position did. Scaled by MIN_HEIGHT/MAX_HEIGHT's original range
    // but heavily compressed (÷4) since it's now additive, not the
    // sole y source.
    const priceNudge = MIN_HEIGHT / 4 + priceScale * (MAX_HEIGHT - MIN_HEIGHT) / 4

    return {
      ...node,
      position: [center.x + x, y + priceNudge, center.z + z],
      priceScale,
      visualScale,
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
// Raised from 950 — at 5 (now 6) arms the previous count still left
// visible gaps between neighboring arms once rendered as soft glow
// sprites instead of hard dots (sprites need overlap to blend into a
// continuous band; hard dots could get away with less coverage).
const FILLER_STARS_PER_ARM = 3800
const HAZE_POINTS_PER_GALAXY = 500
const CORE_DUST_POINTS_PER_GALAXY = 1800
const CORE_DUST_MAX_RADIUS_FRACTION = 0.22
const DEPTH_VARIANCE = 0.28

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

// Box-Muller transform for a deterministic Gaussian sample in [-1, 1]-ish
// range (actually unbounded, but ~99% falls within ±3 std devs). Two
// independent hashed uniforms feed one Gaussian value. This replaces
// the previous uniform (hashToUnit - 0.5) scatter — uniform scatter
// gives an arm a hard-edged rectangular cross-section (every offset
// equally likely), which is what made arms look like flat ribbons/
// mathematical lines. A Gaussian profile concentrates stars near the
// arm's centerline and thins smoothly toward the edges, which is what
// actually reads as a soft, volumetric "arm" rather than a stroked
// path.
function gaussianFromSeed(seed) {
  const u1 = Math.max(hashToUnit(`${seed}-g1`), 1e-6)
  const u2 = hashToUnit(`${seed}-g2`)
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

// Explicit percentile-bucketed star scale: 92% tiny, 6% medium, 2%
// bright accent. Updated from 90/8/2 per brief — the target is for
// tiny stars to absolutely dominate the galaxy's visual texture with
// medium/bright serving only as rare highlights.
function tieredScale(seed, tinyRange = [0.06, 0.22], medRange = [0.22, 0.52], brightRange = [0.52, 1.1]) {
  const roll = hashToUnit(`${seed}-tier`)
  const within = hashToUnit(`${seed}-tierwithin`)
  if (roll < 0.92) {
    return tinyRange[0] + within * (tinyRange[1] - tinyRange[0])
  }
  if (roll < 0.98) {
    return medRange[0] + within * (medRange[1] - medRange[0])
  }
  return brightRange[0] + within * (brightRange[1] - brightRange[0])
}

// Secondary inter-arm dust: sparse, dim, randomly-scattered points
// filling the space BETWEEN primary arms (unlike the arm points,
// which hug a single spiral curve). Same total star budget class as
// the arm dust but far fewer, low-opacity — this is what kills the
// "obviously empty gap between two clean lines" look without adding
// any new arms or increasing overall galaxy size.
const INTERARM_DUST_POINTS_PER_GALAXY = 22000

// Faint outer halo — a sparse, roughly-spherical (not disc-flat) shell
// of very dim points surrounding the whole galaxy, well past
// GALAXY_RADIUS. Real spiral galaxies sit inside a diffuse stellar
// halo; this is a separate, lower-density layer from the disc-hugging
// HAZE_POINTS_PER_GALAXY above (which stays close to the disc plane).
const HALO_POINTS_PER_GALAXY = 8000
const HALO_MIN_RADIUS_FRACTION = 1.0
const HALO_MAX_RADIUS_FRACTION = 1.8

// Diffuse stellar disc — a very large population of tiny, extremely
// dim stars spread across the ENTIRE galaxy (core to rim, all angles,
// not arm-hugging like the arm dust and not restricted like the
// inter-arm layer's slightly-elevated brightness). This is what makes
// the whole disc glow as one continuous mass rather than the arms
// reading as separate bright ribbons floating over black space.
// Deliberately the largest single population and deliberately the
// dimmest — bulk coverage, near-invisible individually, additive in
// aggregate.
const DIFFUSE_DISC_POINTS_PER_GALAXY = 55000


export function generateFillerStars() {
  const stars = []

  for (const site of Object.keys(GALAXY_CENTERS)) {
    const center = galaxyCenter(site)

    for (let arm = 0; arm < VISUAL_ARM_COUNT; arm++) {
      const armOffset = (arm / VISUAL_ARM_COUNT) * Math.PI * 2
      // Small per-arm angular jitter so arms aren't perfectly,
      // mechanically evenly spaced — real multi-arm spirals are close
      // to but not exactly even.
      const armOffsetJitter = (hashToUnit(`armjit-${site}-${arm}`) - 0.5) * 0.35
      const finalArmOffset = armOffset + armOffsetJitter

      // Per-arm "gap" zones: t-ranges along this arm where density is
      // deliberately suppressed, so the arm reads as patchy rather
      // than a mathematically uniform, unbroken stroke.
      const gapCenters = [
        0.2 + hashToUnit(`gap0-${site}-${arm}`) * 0.25,
        0.55 + hashToUnit(`gap1-${site}-${arm}`) * 0.3,
      ]
      const gapWidth = 0.06

      for (let i = 0; i < FILLER_STARS_PER_ARM; i++) {
        const seed = `filler-${site}-${arm}-${i}`
        const t = i / (FILLER_STARS_PER_ARM - 1)

        // Exponential radial bias (t^2.2, was sqrt(t)): sqrt(t) grows
        // fast then flattens, which actually biases toward the OUTER
        // radius. Squaring t biases toward the core instead — slow
        // growth near t=0, accelerating outward — concentrating far
        // more stars near the galactic center and thinning gradually
        // toward the rim, matching real spiral brightness falloff.
        const radiusT = Math.pow(t, 2.2)
        const radius = CORE_RADIUS + radiusT * (GALAXY_RADIUS - CORE_RADIUS)

        const logProgress = Math.log(radius / CORE_RADIUS) / Math.log(GALAXY_RADIUS / CORE_RADIUS)
        const angle = finalArmOffset + logProgress * SPIRAL_TURNS * Math.PI * 2

        // Occasional small branch: stars past the arm's midpoint
        // occasionally peel off at a slightly different angle,
        // mimicking a minor spur rather than every star tracing one
        // perfect curve.
        const isBranch = t > 0.4 && hashToUnit(`${seed}-branch`) < 0.08
        const branchAngle = isBranch
          ? angle + (hashToUnit(`${seed}-branchdir`) - 0.5) * 0.6
          : angle

        const baseX = Math.cos(branchAngle) * radius
        const baseZ = Math.sin(branchAngle) * radius

        // Gaussian perpendicular scatter (was uniform hashToUnit-0.5):
        // dense at the arm centerline, soft-edged falloff, instead of
        // a hard-edged uniform band — this is what makes an arm read
        // as a volumetric band of stars rather than a stroked line.
        // Blended wider near the core (coreBlend) so the core melts
        // smoothly into the first section of the arm instead of the
        // arm starting abruptly at CORE_RADIUS.
        //
        // Width growth uses `t` directly (near-linear), NOT radiusT
        // (t^2.2, the density-shaping curve) — radiusT barely moves
        // until late t, so tying width to it kept arms looking like
        // thin lines through most of their length and only fattening
        // right at the tip. A separate, more linear widen curve makes
        // the arm visibly thicken through the whole outer half, while
        // the spiral's angle/radius placement itself is untouched.
        const coreBlend = 1 - Math.min(t / 0.15, 1)
        const widthT = 0.4 + 0.9 * t + 0.35 * t * t
        const scatterAmount = ARM_SCATTER * widthT * (1 + coreBlend * 1.8)
        const perpAngle = branchAngle + Math.PI / 2
        const gaussian = gaussianFromSeed(seed)
        const scatter = gaussian * scatterAmount * 0.5

        const x = baseX + Math.cos(perpAngle) * scatter
        const z = baseZ + Math.sin(perpAngle) * scatter
        const yJitter = (hashToUnit(`${seed}-y`) - 0.5) * 2 * VERTICAL_SCATTER * 0.7

        const tilted = tiltDiscPoint(x, yJitter, z)
        const depthJitter = (hashToUnit(`${seed}-depth`) - 0.5) * 2 * DEPTH_VARIANCE

        // Density bulge (mid-arm brighter than the tips), combined
        // with explicit gap suppression — a star drops out either
        // from natural sparse tail/rim falloff or from landing inside
        // one of this arm's gap zones. Both fold into one
        // probabilistic check so gaps read as organic thinning.
        const densityBulge = Math.sin(t * Math.PI * 0.9 + 0.15) * 0.5 + 0.5
        const nearGap = gapCenters.some((gc) => Math.abs(t - gc) < gapWidth)
        const gapSuppression = nearGap ? 0.35 : 1
        const keepThreshold = (0.3 + densityBulge * 0.7) * gapSuppression
        const included = hashToUnit(`${seed}-keep`) < keepThreshold
        if (!included) continue

        stars.push({
          key: seed,
          site,
          kind: 'arm',
          position: [center.x + tilted.x, tilted.y + depthJitter, center.z + tilted.z],
          // Explicit 90% tiny / 8% medium / 2% bright split, so
          // oversized glowing particles are genuinely rare rather than
          // just statistically less common.
          scale: tieredScale(`${seed}-arm`) * (0.6 + densityBulge * 0.7),
        })
      }
    }

    // Secondary inter-arm dust — sparse, dim points scattered across
    // the full disc (not confined to any arm curve), same
    // exponential core-weighted radial bias so density still falls
    // off toward the rim. Fills the visible gaps between primary arms
    // instead of leaving flat black space, without adding new arms or
    // increasing overall galaxy size.
    for (let i = 0; i < INTERARM_DUST_POINTS_PER_GALAXY; i++) {
      const seed = `interarm-${site}-${i}`
      const angle = hashToUnit(`${seed}-a`) * Math.PI * 2
      const radiusT = Math.pow(hashToUnit(`${seed}-r`), 1.6)
      const radius = CORE_RADIUS + radiusT * (GALAXY_RADIUS - CORE_RADIUS)
      const yJitter = (hashToUnit(`${seed}-y`) - 0.5) * 2 * VERTICAL_SCATTER * 0.9

      const tilted = tiltDiscPoint(Math.cos(angle) * radius, yJitter, Math.sin(angle) * radius)
      const depthJitter = (hashToUnit(`${seed}-depth`) - 0.5) * 2 * DEPTH_VARIANCE

      stars.push({
        key: seed,
        site,
        kind: 'interarm',
        position: [center.x + tilted.x, tilted.y + depthJitter, center.z + tilted.z],
        scale: tieredScale(`${seed}-interarm`, [0.12, 0.24], [0.24, 0.4], [0.4, 0.6]),
      })
    }

    // Diffuse stellar disc — large population of tiny, very dim
    // points covering the WHOLE disc uniformly by area (radius^2
    // sampling, not exponential/core-weighted like the arm/interarm
    // layers), so it reads as ambient fill rather than tracing any
    // structure of its own. This is the layer that turns "bright arms
    // over black space" into "one continuous glowing disc with
    // brighter arms standing out on top of it."
    for (let i = 0; i < DIFFUSE_DISC_POINTS_PER_GALAXY; i++) {
      const seed = `diffuse-${site}-${i}`
      const angle = hashToUnit(`${seed}-a`) * Math.PI * 2
      // sqrt(hash) gives uniform-by-AREA sampling across the disc
      // (flat density per unit area), as opposed to the arm/interarm
      // layers' core-weighted bias — this layer's job is even
      // baseline coverage, not shaping brightness falloff.
      const radius = CORE_RADIUS + Math.sqrt(hashToUnit(`${seed}-r`)) * (GALAXY_RADIUS - CORE_RADIUS)
      const yJitter = (hashToUnit(`${seed}-y`) - 0.5) * 2 * VERTICAL_SCATTER * 0.8

      const tilted = tiltDiscPoint(Math.cos(angle) * radius, yJitter, Math.sin(angle) * radius)
      const depthJitter = (hashToUnit(`${seed}-depth`) - 0.5) * 2 * DEPTH_VARIANCE

      stars.push({
        key: seed,
        site,
        kind: 'diffuse',
        position: [center.x + tilted.x, tilted.y + depthJitter, center.z + tilted.z],
        // Tiniest range of any layer — this is meant to be countless
        // near-invisible points, not a secondary medium-brightness
        // structure. Still follows the 90/8/2 split so a rare few
        // stand out slightly brighter within this layer too.
        scale: tieredScale(`${seed}-diffuse`, [0.08, 0.16], [0.16, 0.26], [0.26, 0.4]),
      })
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
        scale: 0.55 + hashToUnit(`${seed}-scale`) * 1.15,
      })
    }

    // Faint spherical-ish outer halo — sparse points well past the
    // disc's own radius, with wide untilted vertical spread (halos
    // aren't flat like the disc) so the galaxy sits inside a diffuse
    // stellar envelope rather than ending abruptly at the disc edge.
    for (let i = 0; i < HALO_POINTS_PER_GALAXY; i++) {
      const seed = `halo-${site}-${i}`
      const angle = hashToUnit(`${seed}-a`) * Math.PI * 2
      const radiusFrac =
        HALO_MIN_RADIUS_FRACTION +
        hashToUnit(`${seed}-r`) * (HALO_MAX_RADIUS_FRACTION - HALO_MIN_RADIUS_FRACTION)
      const radius = GALAXY_RADIUS * radiusFrac
      const height = (hashToUnit(`${seed}-y`) - 0.5) * 2 * GALAXY_RADIUS * 0.35

      stars.push({
        key: seed,
        site,
        kind: 'halo',
        position: [
          center.x + Math.cos(angle) * radius,
          height,
          center.z + Math.sin(angle) * radius,
        ],
        scale: tieredScale(`${seed}-halo`, [0.2, 0.35], [0.35, 0.55], [0.55, 0.8]),
      })
    }

    // Galactic bulge — a 3D Gaussian population centred at the core,
    // extending ~40% of GALAXY_RADIUS laterally with Gaussian falloff,
    // but with MUCH more vertical spread than the flat disc layers
    // (those use VERTICAL_SCATTER ≈ 0.8, bulge uses 25% of lateral
    // sigma). This is what gives real spiral galaxies their visible
    // thickness when viewed at an angle — the disc is thin but the
    // central bulge is a flattened spheroid that protrudes clearly.
    const BULGE_COUNT = 6000
    const BULGE_LATERAL_SIGMA = GALAXY_RADIUS * 0.38
    const BULGE_VERTICAL_SIGMA = BULGE_LATERAL_SIGMA * 0.28

    for (let i = 0; i < BULGE_COUNT; i++) {
      const seed = `bulge-${site}-${i}`
      // Box-Muller Gaussian for lateral position
      const u1 = Math.max(hashToUnit(`${seed}-u1`), 1e-6)
      const u2 = hashToUnit(`${seed}-u2`)
      const u3 = Math.max(hashToUnit(`${seed}-u3`), 1e-6)
      const u4 = hashToUnit(`${seed}-u4`)
      const gx = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * BULGE_LATERAL_SIGMA
      const gz = Math.sqrt(-2 * Math.log(u3)) * Math.cos(2 * Math.PI * u4) * BULGE_LATERAL_SIGMA
      // Vertical distribution is its own independent Gaussian with a
      // shorter sigma — the bulge is a flattened ellipsoid, not a sphere.
      const u5 = Math.max(hashToUnit(`${seed}-u5`), 1e-6)
      const u6 = hashToUnit(`${seed}-u6`)
      const gy = Math.sqrt(-2 * Math.log(u5)) * Math.cos(2 * Math.PI * u6) * BULGE_VERTICAL_SIGMA

      // Radial distance from bulge center — used to dim outer-bulge
      // stars so the brightness profile falls off smoothly (Sersic-like)
      const r2 = (gx * gx + gz * gz) / (BULGE_LATERAL_SIGMA * BULGE_LATERAL_SIGMA)
      // Skip stars in the outer Gaussian tail that are too dim to be
      // worth rendering — reduces total count without visible impact.
      if (hashToUnit(`${seed}-keep`) > Math.exp(-r2 * 0.7)) continue

      stars.push({
        key: seed,
        site,
        kind: 'bulge',
        position: [center.x + gx, gy, center.z + gz],
        scale: tieredScale(`${seed}-bulge`, [0.12, 0.24], [0.24, 0.42], [0.42, 0.7]),
      })
    }
  }

  return stars
}

/**
 * Dense compact dust ring hugging each galaxy's core (radius up to
 * CORE_DUST_MAX_RADIUS_FRACTION * GALAXY_RADIUS). Distinct from the
 * arm/haze points above: no arm structure, just tight, bright,
 * randomly-scattered points concentrated close to center so the core
 * transitions into the spiral through a dense dust collar rather than
 * a bare gap. Rendered by GalaxyStarfield as its own brighter, denser
 * point layer.
 */
export function generateCoreDust() {
  const points = []

  for (const site of Object.keys(GALAXY_CENTERS)) {
    const center = galaxyCenter(site)
    const maxR = GALAXY_RADIUS * CORE_DUST_MAX_RADIUS_FRACTION

    for (let i = 0; i < CORE_DUST_POINTS_PER_GALAXY; i++) {
      const seed = `coredust-${site}-${i}`
      const angle = hashToUnit(`${seed}-a`) * Math.PI * 2
      // sqrt bias concentrates points near the core, thinning toward
      // the outer edge of the dust collar.
      const radius = CORE_RADIUS + Math.sqrt(hashToUnit(`${seed}-r`)) * (maxR - CORE_RADIUS)
      const height = (hashToUnit(`${seed}-y`) - 0.5) * 2 * VERTICAL_SCATTER * 0.5

      const tilted = tiltDiscPoint(Math.cos(angle) * radius, height, Math.sin(angle) * radius)

      points.push({
        key: seed,
        site,
        position: [center.x + tilted.x, tilted.y, center.z + tilted.z],
        scale: tieredScale(`${seed}-coredust`, [0.28, 0.5], [0.5, 0.8], [0.8, 1.3]),
      })
    }
  }

  return points
}

// Metadata for the galaxy name/count labels rendered in the scene
// (panel 01 in the design reference: "JUMIA GALAXY — 48 products").
// Counts are populated by the caller from real fetched data — this
// just declares which sites get labels and in what display order.
export function getGalaxyDisplayOrder() {
  return Object.keys(GALAXY_CENTERS)
}
