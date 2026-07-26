import { useMemo } from 'react'
import * as THREE from 'three'
import { generateFillerStars, generateCoreDust } from './galaxyLayout'

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
const AMBIENT_DUST_COUNT = 320
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

// Soft radial-gradient sprite texture, generated once and shared by
// every points layer in this file. This is the core fix for the
// "particle spiral instead of galaxy dust" problem: the previous
// build used THREE.PointsMaterial's default hard-edged square dot,
// which at any density still reads as discrete dots/lines rather than
// a soft continuous glow. A radial-gradient alpha map + additive
// blending is what real three.js galaxy/starfield demos use to get
// overlapping points to melt into a luminous band instead of a
// scatter of squares.
function makeSoftDiscTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  )
  // 5-stop falloff: very bright core → gradual cinematic taper.
  // Pulling the visible glow to only the inner 55% of the sprite's
  // radius means the outer 45% is fully transparent — sprites overlap
  // and blend additively at their bright centers without leaving a
  // hard ring/disc impression at the sprite boundary.
  gradient.addColorStop(0,    'rgba(255,255,255,1)')
  gradient.addColorStop(0.08, 'rgba(255,255,255,0.92)')
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.12)')
  gradient.addColorStop(1,    'rgba(255,255,255,0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

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

    const brightness = 0.3 + hashToUnitLocal(`${seed}-b`) * 0.35
    colors[i * 3] = brightness * 0.85
    colors[i * 3 + 1] = brightness * 0.9
    colors[i * 3 + 2] = brightness
  }

  return { positions, colors }
}

function buildBuffers(stars, brightnessFn) {
  const positions = new Float32Array(stars.length * 3)
  const colors = new Float32Array(stars.length * 3)
  const color = new THREE.Color()

  stars.forEach((star, i) => {
    positions[i * 3] = star.position[0]
    positions[i * 3 + 1] = star.position[1]
    positions[i * 3 + 2] = star.position[2]

    color.set(SITE_COLORS[star.site] ?? '#ffffff')
    const brightness = brightnessFn(star)
    colors[i * 3] = color.r * brightness
    colors[i * 3 + 1] = color.g * brightness
    colors[i * 3 + 2] = color.b * brightness
  })

  return { positions, colors }
}

/**
 * GalaxyStarfield — dense, purely decorative filler points tracing
 * clean spiral arms, a bright compact core dust collar, plus a soft
 * nebula haze halo around each galaxy.
 *
 * All layers render with a soft glow-sprite alphaMap + additive
 * blending instead of PointsMaterial's default hard square dot — this
 * is what makes dense overlapping points melt into a continuous
 * luminous band ("real spiral galaxy") instead of reading as a
 * particle-effect scatter.
 */
function GalaxyStarfield() {
  const softTexture = useMemo(() => makeSoftDiscTexture(), [])

  const { armBuffers, armFineBuffers, hazeBuffers, coreDustBuffers, interarmBuffers, diffuseBuffers, haloBuffers, bulgeBuffers, ambientBuffers } = useMemo(() => {
    const stars = generateFillerStars()
    const armStars     = stars.filter((s) => s.kind === 'arm')
    const hazeStars    = stars.filter((s) => s.kind === 'haze')
    const interarmStars= stars.filter((s) => s.kind === 'interarm')
    const diffuseStars = stars.filter((s) => s.kind === 'diffuse')
    const haloStars    = stars.filter((s) => s.kind === 'halo')
    const bulgeStars   = stars.filter((s) => s.kind === 'bulge')
    const coreDust     = generateCoreDust()

    return {
      armBuffers:      buildBuffers(armStars,      (s) => 0.75 + s.scale * 0.6),
      armFineBuffers:  buildBuffers(armStars,      (s) => 0.55 + s.scale * 0.4),
      hazeBuffers:     buildBuffers(hazeStars,     (s) => 0.5  + s.scale * 0.4),
      coreDustBuffers: buildBuffers(coreDust,      (s) => 0.85 + s.scale * 0.5),
      interarmBuffers: buildBuffers(interarmStars, (s) => 0.3  + s.scale * 0.3),
      diffuseBuffers:  buildBuffers(diffuseStars,  (s) => 0.18 + s.scale * 0.25),
      haloBuffers:     buildBuffers(haloStars,     (s) => 0.4  + s.scale * 0.35),
      // Bulge stars fade with radius (handled in generator) and are
      // rendered at medium opacity — they sit at the core–arm transition
      // so they shouldn't overpower the arm points.
      bulgeBuffers:    buildBuffers(bulgeStars,    (s) => 0.45 + s.scale * 0.4),
      ambientBuffers:  buildAmbientDust(),
    }
  }, [])

  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={coreDustBuffers.positions.length / 3}
            array={coreDustBuffers.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={coreDustBuffers.colors.length / 3}
            array={coreDustBuffers.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.92}
          vertexColors
          map={softTexture}
          alphaMap={softTexture}
          transparent
          opacity={0.80}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      {/* Galactic bulge — 3D Gaussian population bridging core to disc.
          Rendered at medium size/opacity: bright enough to read as the
          galaxy's central mass, dim enough not to overpower the arms. */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={bulgeBuffers.positions.length/3} array={bulgeBuffers.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={bulgeBuffers.colors.length/3}    array={bulgeBuffers.colors}    itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.44} vertexColors map={softTexture} alphaMap={softTexture}
          transparent opacity={0.65} sizeAttenuation depthWrite={false}
          blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>

      {/* Second fine-grain bulge pass at tiny size — adds the countless
          pinpoint stars seen in real galactic centres. */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={bulgeBuffers.positions.length/3} array={bulgeBuffers.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={bulgeBuffers.colors.length/3}    array={bulgeBuffers.colors}    itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.16} vertexColors map={softTexture} alphaMap={softTexture}
          transparent opacity={0.45} sizeAttenuation depthWrite={false}
          blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>

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
          size={0.78}
          vertexColors
          map={softTexture}
          alphaMap={softTexture}
          transparent
          opacity={0.68}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={armFineBuffers.positions.length / 3}
            array={armFineBuffers.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={armFineBuffers.colors.length / 3}
            array={armFineBuffers.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.26}
          vertexColors
          map={softTexture}
          alphaMap={softTexture}
          transparent
          opacity={0.56}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      {/* Inter-arm dust — fills the gaps between primary spiral arms
          so the disc doesn't read as empty black space between clean
          lines. Dim and low-density relative to the arm layers. */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={interarmBuffers.positions.length / 3}
            array={interarmBuffers.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={interarmBuffers.colors.length / 3}
            array={interarmBuffers.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.34}
          vertexColors
          map={softTexture}
          alphaMap={softTexture}
          transparent
          opacity={0.45}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      {/* Diffuse stellar disc — very large population of tiny, near-
          invisible individually points covering the whole disc
          uniformly. This is what turns the scene from "bright arms
          floating over black space" into "one continuous glowing
          disc with brighter arms standing out on top." Smallest size
          and lowest opacity of any layer — pure ambient bulk fill. */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={diffuseBuffers.positions.length / 3}
            array={diffuseBuffers.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={diffuseBuffers.colors.length / 3}
            array={diffuseBuffers.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.48}
          vertexColors
          map={softTexture}
          alphaMap={softTexture}
          transparent
          opacity={0.62}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
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
          size={1.4}
          vertexColors
          map={softTexture}
          alphaMap={softTexture}
          transparent
          opacity={0.32}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      {/* Faint outer halo — sparse points in a wide spherical-ish
          shell surrounding the whole galaxy, well past the disc's own
          radius, so the galaxy doesn't end abruptly at its edge.
          Strengthened opacity/size vs the first pass so it's clearly
          visible rather than nearly imperceptible. */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={haloBuffers.positions.length / 3}
            array={haloBuffers.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={haloBuffers.colors.length / 3}
            array={haloBuffers.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.52}
          vertexColors
          map={softTexture}
          alphaMap={softTexture}
          transparent
          opacity={0.34}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
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
          size={0.36}
          vertexColors
          map={softTexture}
          alphaMap={softTexture}
          transparent
          opacity={0.4}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </>
  )
}

export default GalaxyStarfield
