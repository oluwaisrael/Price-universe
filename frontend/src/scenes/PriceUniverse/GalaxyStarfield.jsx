import { useMemo } from 'react'
import * as THREE from 'three'
import { generateFillerStars } from './galaxyLayout'

const SITE_COLORS = {
  Jumia: '#ff9900',
  Jiji: '#22e5e5',
}

// Deterministic wide-field ambient dust — fine, dim, mostly-white
// specks scattered across the whole navigable area (not anchored to
// either galaxy's center). The per-galaxy haze in generateFillerStars()
// stays close to each core, so the open black space between and
// around the two galaxies was reading as empty; this fills it in
// without competing with either galaxy's color identity.
const AMBIENT_DUST_COUNT = 260
const AMBIENT_DUST_SPREAD_X = 70
const AMBIENT_DUST_SPREAD_Z = 55
const AMBIENT_DUST_HEIGHT = 12

function hashToUnitLocal(str) {
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

// Centered on the galaxy midpoint (matches CameraRig's DEFAULT_TARGET
// and galaxyLayout's current GALAXY_CENTERS), not world origin — the
// composition pass moved both galaxies off-origin, and this dust
// field was still centered on (0,0), hazing up space that's no longer
// where the action is.
const AMBIENT_DUST_CENTER_X = 38
const AMBIENT_DUST_CENTER_Z = -14

function buildAmbientDust() {
  const positions = new Float32Array(AMBIENT_DUST_COUNT * 3)
  const colors = new Float32Array(AMBIENT_DUST_COUNT * 3)

  for (let i = 0; i < AMBIENT_DUST_COUNT; i++) {
    const seed = `ambient-dust-${i}`
    const x = AMBIENT_DUST_CENTER_X + (hashToUnitLocal(`${seed}-x`) - 0.5) * 2 * AMBIENT_DUST_SPREAD_X
    const z = AMBIENT_DUST_CENTER_Z + (hashToUnitLocal(`${seed}-z`) - 0.5) * 2 * AMBIENT_DUST_SPREAD_Z
    const y = (hashToUnitLocal(`${seed}-y`) - 0.5) * 2 * AMBIENT_DUST_HEIGHT

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    // Cool, mostly-white/blue-gray tint so it reads as neutral
    // background dust rather than belonging to either galaxy.
    const brightness = 0.3 + hashToUnitLocal(`${seed}-b`) * 0.35
    colors[i * 3] = brightness * 0.85
    colors[i * 3 + 1] = brightness * 0.9
    colors[i * 3 + 2] = brightness
  }

  return { positions, colors }
}

function buildBuffers(stars) {
  const positions = new Float32Array(stars.length * 3)
  const colors = new Float32Array(stars.length * 3)
  const color = new THREE.Color()

  stars.forEach((star, i) => {
    positions[i * 3] = star.position[0]
    positions[i * 3 + 1] = star.position[1]
    positions[i * 3 + 2] = star.position[2]

    color.set(SITE_COLORS[star.site] ?? '#ffffff')
    // Raised floor/range (was 0.35 + scale*0.25, capping under 0.6) —
    // at the default camera distance (~58-70 units) points this dim
    // were essentially sub-pixel specks even with Bloom active, which
    // is why the spiral wasn't reading despite the correct math.
    const brightness = 0.65 + star.scale * 0.55
    colors[i * 3] = color.r * brightness
    colors[i * 3 + 1] = color.g * brightness
    colors[i * 3 + 2] = color.b * brightness
  })

  return { positions, colors }
}

/**
 * GalaxyStarfield — dense, purely decorative filler points tracing
 * clean spiral arms (small, brighter, sequentially placed along the
 * curve) plus a soft nebula haze (larger, dimmer, randomly scattered
 * in a halo around each galaxy). Two separate THREE.Points clouds
 * since size/opacity can't vary per-point on a single material
 * without a custom shader — not needed at this point count.
 *
 * generateFillerStars() is deterministic and has no dependency on
 * fetched data, so both buffers are built once via useMemo.
 */
function GalaxyStarfield() {
  const { armBuffers, hazeBuffers, ambientBuffers } = useMemo(() => {
    const stars = generateFillerStars()
    const armStars = stars.filter((s) => s.kind === 'arm')
    const hazeStars = stars.filter((s) => s.kind === 'haze')

    return {
      armBuffers: buildBuffers(armStars),
      hazeBuffers: buildBuffers(hazeStars),
      ambientBuffers: buildAmbientDust(),
    }
  }, [])

  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={armBuffers.positions.length / 3}
            array={armBuffers.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={armBuffers.colors.length / 3}
            array={armBuffers.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.42}
          vertexColors
          transparent
          opacity={0.95}
          sizeAttenuation
          depthWrite={false}
          toneMapped={false}
        />
      </points>

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={hazeBuffers.positions.length / 3}
            array={hazeBuffers.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={hazeBuffers.colors.length / 3}
            array={hazeBuffers.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1.1}
          vertexColors
          transparent
          opacity={0.22}
          sizeAttenuation
          depthWrite={false}
          toneMapped={false}
        />
      </points>

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={ambientBuffers.positions.length / 3}
            array={ambientBuffers.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={ambientBuffers.colors.length / 3}
            array={ambientBuffers.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.3}
          vertexColors
          transparent
          opacity={0.3}
          sizeAttenuation
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </>
  )
}

export default GalaxyStarfield
