import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * GalaxyNebula — replaces the single centered radial-gradient sprite
 * (which rendered as a visible circular disc boundary) with a cluster
 * of 5–6 overlapping sprites at deliberately different positions,
 * scales, and noise levels. Their outer edges are staggered so no
 * single circular edge is visible — the composite reads as a ragged,
 * organic volumetric gas cloud, which is what actual nebula in galaxy
 * renders look like.
 *
 * The technique: each sprite uses a canvas-generated radial gradient
 * that fades completely to 0 at the edge (hard requirement — any
 * nonzero edge alpha produces a visible "ring"). Per-pixel multiplicative
 * noise is applied to the alpha channel after gradient fill on most
 * sprites, so their boundaries are fractal-ragged rather than circular.
 */

function makeNebulaTex(colorHex, noiseStrength = 0, innerFrac = 0.35, seed = 0) {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const cx = size / 2, cy = size / 2

  const color = new THREE.Color(colorHex)
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)

  // Inner fraction controls how quickly the gradient pulls in —
  // smaller values = tighter, brighter core, darker outer area.
  // Varying this across sprites gives them different apparent radii
  // even at the same scale, so no two sprite boundaries coincide.
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx)
  gradient.addColorStop(0,            `rgba(${r},${g},${b},0.9)`)
  gradient.addColorStop(innerFrac * 0.3, `rgba(${r},${g},${b},0.55)`)
  gradient.addColorStop(innerFrac,    `rgba(${r},${g},${b},0.22)`)
  gradient.addColorStop(innerFrac * 2, `rgba(${r},${g},${b},0.06)`)
  gradient.addColorStop(0.85,         `rgba(${r},${g},${b},0.008)`)
  gradient.addColorStop(1,            `rgba(${r},${g},${b},0)`)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  if (noiseStrength > 0) {
    const imgData = ctx.getImageData(0, 0, size, size)
    const data = imgData.data
    // Deterministic LCG so the same sprite always looks the same —
    // avoids frame-to-frame flicker and keeps the scene deterministic.
    let s = (seed * 1664525 + 1013904223) >>> 0
    for (let i = 0; i < data.length; i += 4) {
      s = (s * 1664525 + 1013904223) >>> 0
      const n = (s >>> 0) / 4294967295
      // Multiplicative noise: pixels near 0 stay near 0; bright core
      // is barely touched. Outer-ring pixels (low alpha) get the most
      // distortion, which is exactly where we want to break the edge.
      const alphaScale = 1.0 - n * noiseStrength * (1.0 - data[i + 3] / 255)
      data[i + 3] = Math.max(0, Math.floor(data[i + 3] * alphaScale))
    }
    ctx.putImageData(imgData, 0, 0)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

// Per-galaxy cluster of sprites. Each entry defines one sprite in the
// cluster: [dx, dy, dz] offset from galaxy center (world units),
// [sx, sz] non-square scale (avoids perfect circles), opacity, and
// the texture parameters. All use AdditiveBlending.
const CLUSTER = [
  // Tight bright core sprite — minimal noise so it reads as luminous center
  { dx:  0,    dy: 0.1, dz:  0,    sxf: 0.38, szf: 0.34, op: 0.70, noise: 0.15, inner: 0.28, seed: 1 },
  // Mid halo — slightly off-center so its edge doesn't match the core sprite
  { dx: -0.6,  dy: 0,   dz:  0.5,  sxf: 0.72, szf: 0.68, op: 0.38, noise: 0.55, inner: 0.32, seed: 2 },
  // Counter-offset mid — fills opposite side, breaks circular symmetry
  { dx:  0.7,  dy: 0,   dz: -0.4,  sxf: 0.70, szf: 0.74, op: 0.30, noise: 0.65, inner: 0.30, seed: 3 },
  // Wide outer halo — heavy noise so far edge is fully ragged
  { dx: -0.3,  dy: 0.2, dz:  0.6,  sxf: 1.20, szf: 1.12, op: 0.18, noise: 0.82, inner: 0.25, seed: 4 },
  // Very wide faint corona — extends well past the disc
  { dx:  0.4,  dy: 0,   dz: -0.3,  sxf: 1.65, szf: 1.55, op: 0.08, noise: 0.90, inner: 0.20, seed: 5 },
  // Asymmetric splotch — gives the cloud one "bright lobe" off-axis
  { dx:  1.2,  dy: 0.1, dz:  0.8,  sxf: 0.55, szf: 0.45, op: 0.22, noise: 0.70, inner: 0.35, seed: 6 },
]

function GalaxyNebula({ center, color, radius = 12, opacity = 1.0 }) {
  const textures = useMemo(
    () => CLUSTER.map((c) => makeNebulaTex(color, c.noise, c.inner, c.seed)),
    [color]
  )

  return (
    <>
      {CLUSTER.map((c, i) => (
        <sprite
          key={i}
          position={[center.x + c.dx, c.dy, center.z + c.dz]}
          scale={[radius * c.sxf * 2, radius * c.szf * 2, 1]}
          renderOrder={-1 - i}
        >
          <spriteMaterial
            map={textures[i]}
            transparent
            opacity={c.op * opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </>
  )
}

// AmbientNebula — still a single sprite (it's already far from the
// camera and not at risk of visible circular edges at its scale), but
// with heavier noise applied so it also reads as organic rather than
// a perfect circle.
function AmbientNebula({ position, color, radius, opacity = 0.18 }) {
  const texture = useMemo(() => makeNebulaTex(color, 0.75, 0.28, position[0] | 0), [color, position])

  return (
    <sprite position={position} scale={[radius * 2, radius * 2, 1]} renderOrder={-2}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  )
}

export { AmbientNebula }
export default GalaxyNebula
