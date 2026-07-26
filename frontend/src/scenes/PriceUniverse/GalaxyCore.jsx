import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'

/**
 * GalaxyCore — pure particle/sprite implementation. No sphere meshes.
 *
 * Previous version used sphereGeometry at radius 2.2 / 3.9 / 10 / 19
 * with meshBasicMaterial. Those produced visually perfect circular
 * halos whose edges were clearly visible as a disc/ring — exactly the
 * "circular translucent glow mesh" the brief asks to remove. Replaced
 * with:
 *   - A dense central points cloud (Gaussian radial falloff, no fixed
 *     edge) for the nucleus and the core-to-arm transition zone.
 *   - Multiple layered canvas-gradient sprites at offset positions and
 *     scales (not all centered) so overlapping soft-edged circles mask
 *     each other's boundaries — no single circle edge is visible.
 *   - A strong animated point light (same as before).
 *   - Sparkles (same as before, unchanged).
 */

// Noisy radial gradient for the halo sprites — the outer half fades
// to zero so overlapping sprites blend without showing a hard ring.
function makeHaloSprite(colorHex, noiseAmount = 0) {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const cx = size / 2
  const cy = size / 2

  const color = new THREE.Color(colorHex)
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx)
  gradient.addColorStop(0,    `rgba(${r},${g},${b},1)`)
  gradient.addColorStop(0.06, `rgba(${r},${g},${b},0.85)`)
  gradient.addColorStop(0.18, `rgba(${r},${g},${b},0.45)`)
  gradient.addColorStop(0.38, `rgba(${r},${g},${b},0.14)`)
  gradient.addColorStop(0.62, `rgba(${r},${g},${b},0.04)`)
  gradient.addColorStop(1,    `rgba(${r},${g},${b},0)`)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  // Optional per-pixel noise to break up the perfect radial symmetry
  // — on the larger halo sprites only (noiseAmount > 0) so the disc
  // boundary reads as an organic "cloud" edge, not a circle.
  if (noiseAmount > 0) {
    const imgData = ctx.getImageData(0, 0, size, size)
    const data = imgData.data
    // LCG for fast deterministic pseudo-noise per pixel
    let seed = 0x12345678
    for (let i = 3; i < data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff
      const n = ((seed >>> 0) / 4294967295) * noiseAmount
      data[i] = Math.max(0, data[i] - n * 255)
    }
    ctx.putImageData(imgData, 0, 0)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

// Dense particle cloud for the nucleus and core-disc transition zone.
// Pure radial Gaussian falloff — no geometry boundary possible since
// it's a point cloud. FWHM ≈ coreRadius so density halves by radius r.
function buildCoreParticles(center, colorHex, coreRadius, count) {
  const color = new THREE.Color(colorHex)
  const positions = new Float32Array(count * 3)
  const colors    = new Float32Array(count * 3)

  // Simple deterministic LCG — avoids importing hashToUnit from
  // galaxyLayout (which would create a circular dep) while staying
  // perfectly reproducible across renders.
  let seed = 0xdeadbeef
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return (seed >>> 0) / 4294967295
  }

  // Box-Muller for a Gaussian distribution of radii. Most stars land
  // inside 1 sigma (coreRadius), with a long tail reaching outward —
  // exactly a galactic-bulge brightness profile.
  for (let i = 0; i < count; i++) {
    const u1 = Math.max(rand(), 1e-6)
    const u2 = rand()
    const u3 = Math.max(rand(), 1e-6)
    const u4 = rand()

    const gx = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const gz = Math.sqrt(-2 * Math.log(u3)) * Math.cos(2 * Math.PI * u4)
    // Vertical bulge — disc-plane thickness ~15% of lateral spread,
    // creating a flattened ellipsoid (not a sphere or flat disc).
    const gy = (rand() - 0.5) * 2 * (coreRadius * 0.15)

    positions[i * 3]     = center.x + gx * coreRadius
    positions[i * 3 + 1] = gy
    positions[i * 3 + 2] = center.z + gz * coreRadius

    // Brightness falls off with radius so the outer-tail stars don't
    // read as uniformly-bright and give away the Gaussian distribution
    // shape — real bulge stars have the same radial dimming.
    const r2 = gx * gx + gz * gz
    const brightness = Math.exp(-r2 * 0.35) * 0.9 + 0.1
    colors[i * 3]     = color.r * brightness
    colors[i * 3 + 1] = color.g * brightness
    colors[i * 3 + 2] = color.b * brightness
  }

  return { positions, colors }
}

function GalaxyCore({ center, color }) {
  const lightRef = useRef()
  const halo0Ref = useRef()
  const halo1Ref = useRef()
  const halo2Ref = useRef()

  // Textures — three separate ones so they can have slightly different
  // noise seeds and therefore different "ragged" edges that don't
  // align into a single visible circle when overlaid.
  const texCore   = useMemo(() => makeHaloSprite(color, 0),     [color])
  const texMid    = useMemo(() => makeHaloSprite(color, 0.55),  [color])
  const texFar    = useMemo(() => makeHaloSprite(color, 0.82),  [color])
  const texWhite  = useMemo(() => makeHaloSprite('#ffffff', 0), [])

  // Dense nucleus particle cloud — the galactic bulge.
  const nucleusBuffers = useMemo(() => buildCoreParticles(center, color, 3.5, 2200), [center, color])
  const bulgeBuffers   = useMemo(() => buildCoreParticles(center, color, 8.0, 1800), [center, color])

  // Soft particle sprite texture (same as GalaxyStarfield).
  const softTexture = useMemo(() => {
    const size = 128
    const c = document.createElement('canvas')
    c.width = size; c.height = size
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(size/2,size/2,0, size/2,size/2,size/2)
    g.addColorStop(0,    'rgba(255,255,255,1)')
    g.addColorStop(0.12, 'rgba(255,255,255,0.82)')
    g.addColorStop(0.4,  'rgba(255,255,255,0.22)')
    g.addColorStop(1,    'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(c)
    tex.needsUpdate = true
    return tex
  }, [])

  useFrame((state) => {
    const t   = state.clock.elapsedTime
    const p   = Math.sin(t * 0.6) * 0.5 + 0.5  // 0..1, slow breathe

    if (lightRef.current) lightRef.current.intensity = 8 + p * 3

    // The three halo sprites breathe at slightly different phases so
    // they never all peak/trough simultaneously — gives the core a
    // more organic, "alive" feel than a single uniform pulse.
    if (halo0Ref.current) halo0Ref.current.opacity = 0.55 + Math.sin(t * 0.6)         * 0.12
    if (halo1Ref.current) halo1Ref.current.opacity = 0.28 + Math.sin(t * 0.6 + 1.1)  * 0.08
    if (halo2Ref.current) halo2Ref.current.opacity = 0.12 + Math.sin(t * 0.6 + 2.2)  * 0.04
  })

  const cx = center.x
  const cz = center.z

  return (
    <group>
      {/* ── NUCLEUS PARTICLE CLOUD ──────────────────────────────────────
          Dense Gaussian-distributed point cloud; no hard geometry edge.
          Three sizes to match the 90/8/2 distribution used elsewhere. */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={nucleusBuffers.positions.length/3} array={nucleusBuffers.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={nucleusBuffers.colors.length/3}    array={nucleusBuffers.colors}    itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.55} vertexColors map={softTexture} alphaMap={softTexture}
          transparent opacity={0.95} sizeAttenuation depthWrite={false}
          blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>

      {/* Finer bright grain inside the nucleus */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={nucleusBuffers.positions.length/3} array={nucleusBuffers.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={nucleusBuffers.colors.length/3}    array={nucleusBuffers.colors}    itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.18} vertexColors map={softTexture} alphaMap={softTexture}
          transparent opacity={0.75} sizeAttenuation depthWrite={false}
          blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>

      {/* Extended bulge — reaches out to where spiral arms begin */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={bulgeBuffers.positions.length/3} array={bulgeBuffers.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={bulgeBuffers.colors.length/3}    array={bulgeBuffers.colors}    itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.38} vertexColors map={softTexture} alphaMap={softTexture}
          transparent opacity={0.58} sizeAttenuation depthWrite={false}
          blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>

      {/* ── LAYERED HALO SPRITES ────────────────────────────────────────
          Three overlapping sprites at deliberately different positions,
          scales, and noise seeds. The slight offsets mean their outer
          edges never align into one visible circle. Additive blending
          so they naturally brighten where they overlap. */}

      {/* White-hot very tight central spot — what Bloom blows out. */}
      <sprite position={[cx, 0.1, cz]} scale={[4, 4, 1]} renderOrder={0}>
        <spriteMaterial ref={halo0Ref} map={texWhite} transparent opacity={0.55}
          depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>

      {/* Inner colored glow — centered */}
      <sprite position={[cx, -0.1, cz]} scale={[14, 14, 1]} renderOrder={-1}>
        <spriteMaterial map={texCore} transparent opacity={0.38}
          depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>

      {/* Mid halo — offset slightly so edge differs from inner glow */}
      <sprite position={[cx - 0.4, 0.2, cz + 0.3]} scale={[32, 30, 1]} renderOrder={-2}>
        <spriteMaterial ref={halo1Ref} map={texMid} transparent opacity={0.28}
          depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>

      {/* Far halo — offset the other direction, noisy edge */}
      <sprite position={[cx + 0.5, -0.3, cz - 0.4]} scale={[60, 56, 1]} renderOrder={-3}>
        <spriteMaterial ref={halo2Ref} map={texFar} transparent opacity={0.12}
          depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>

      {/* Extra wide faint outer corona — very large, very dim */}
      <sprite position={[cx - 0.2, 0.1, cz + 0.2]} scale={[110, 105, 1]} renderOrder={-4}>
        <spriteMaterial map={texFar} transparent opacity={0.055}
          depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>

      {/* ── POINT LIGHT ─────────────────────────────────────────────── */}
      <pointLight ref={lightRef} position={[cx, 0, cz]}
        color={color} intensity={8} distance={80} decay={1.4} />

      {/* ── SPARKLES ────────────────────────────────────────────────── */}
      <Sparkles
        position={[cx, 0, cz]}
        count={120}
        scale={[22, 3, 22]}
        size={2.5}
        speed={0.12}
        opacity={0.9}
        color={color}
      />
    </group>
  )
}

export default GalaxyCore
