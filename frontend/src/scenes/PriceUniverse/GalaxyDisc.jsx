import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * GalaxyDisc — layered tilted planes providing the primary luminous
 * disc beneath the spiral arm particles.
 *
 * TILT DIRECTION: tiltDiscPoint() in galaxyLayout.js does a POSITIVE
 * X-axis rotation (y' = y*cos - z*sin, z' = y*sin + z*cos), which
 * tilts the BACK of the disc upward (+z points up in world space after
 * tilt). To match this, the PlaneGeometry must rotate by NEGATIVE
 * DISC_TILT_RAD around X — a positive angle would tilt the plane the
 * other way (bottom-right wedge as seen in the broken screenshot).
 *
 * SIZE: outer layer at sxMult=1.2 → 1.2 * 26 * 2 = 62 units max.
 * Previous sxMult=2.4 produced a 124-unit plane that filled the entire
 * viewport as a solid orange/teal wall. Capped at 1.2.
 */

const DISC_TILT_RAD = (42 * Math.PI) / 180

function makeDiscTex({
  size      = 512,
  noiseSeed = 1,
  noiseStr  = 0.5,
  rings     = [],
  corePow   = 2.5,
  baseAlpha = 0.8,
} = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const cx = size / 2, cy = size / 2, cr = size / 2

  const imgData = ctx.createImageData(size, size)
  const data = imgData.data

  let s = (noiseSeed * 1664525 + 1013904223) >>> 0
  const lcg = () => { s = (s * 1664525 + 1013904223) >>> 0; return (s >>> 0) / 4294967295 }

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = (px - cx) / cr
      const dy = (py - cy) / cr
      const dist = Math.sqrt(dx*dx + dy*dy)

      if (dist > 1) { lcg(); continue }

      let alpha = Math.pow(Math.max(0, 1 - dist), corePow) * baseAlpha

      for (const ring of rings) {
        const rd = Math.abs(dist - ring.r)
        if (rd < ring.width) {
          alpha = Math.min(1, alpha + ring.alpha * Math.pow(1 - rd / ring.width, 1.8))
        }
      }

      const n = lcg()
      const nf = noiseStr * Math.pow(Math.max(0, dist - 0.35), 2.0)
      alpha = Math.max(0, alpha * (1 - n * nf))

      const idx = (py * size + px) * 4
      data[idx] = data[idx+1] = data[idx+2] = 255
      data[idx+3] = Math.round(Math.min(1, alpha) * 255)
    }
  }

  ctx.putImageData(imgData, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

const LAYERS = [
  // Soft outer wash under particle arms (not a solid disc)
  { sxMult: 1.0, opacity: 0.08, texOpts: { noiseStr: 0.9, noiseSeed: 1, corePow: 1.35, baseAlpha: 0.30, rings: [] } },
  // Mid under-glow
  { sxMult: 0.78, opacity: 0.18, texOpts: { noiseStr: 0.65, noiseSeed: 2, corePow: 1.9, baseAlpha: 0.42, rings: [] } },
  // Core transition — ~12% larger than previous thin-arm pass
  { sxMult: 0.38, opacity: 0.88, texOpts: { noiseStr: 0.12, noiseSeed: 5, corePow: 3.6, baseAlpha: 0.92, rings: [] } },
  // Hot nucleus
  { sxMult: 0.18, opacity: 0.70, texOpts: { noiseStr: 0.04, noiseSeed: 6, corePow: 5.2, baseAlpha: 0.65, rings: [] } },
  // Bright core pin — bloom expands this
  { sxMult: 0.07, opacity: 0.72, texOpts: { noiseStr: 0.0, noiseSeed: 7, corePow: 7.5, baseAlpha: 0.72, rings: [] } },
]

function GalaxyDisc({ center, color, radius }) {
  const meshRefs = useRef([])
  const col = useMemo(() => new THREE.Color(color), [color])

  const textures = useMemo(() => LAYERS.map((layer, i) => {
    const size = (i === 2 || i === 3) ? 1024 : 512
    return makeDiscTex({ size, ...layer.texOpts })
  }), [])

  useFrame((state) => {
    const breathe = Math.sin(state.clock.elapsedTime * 0.35) * 0.5 + 0.5
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh?.material) return
      const inner = i / (LAYERS.length - 1)
      const pulseAmt = 0.05 + inner * 0.07
      mesh.material.opacity = LAYERS[i].opacity * (1 - pulseAmt + breathe * pulseAmt)
    })
  })

  return (
    <group>
      {LAYERS.map((layer, i) => {
        const d = radius * layer.sxMult * 2
        return (
          <mesh
            key={i}
            ref={(el) => { meshRefs.current[i] = el }}
            position={[center.x, -0.5 + i * 0.06, center.z]}
            // NEGATIVE tilt — matches tiltDiscPoint() positive-X convention.
            // Positive rotation here tilted the disc the wrong way,
            // producing the massive orange wedge filling the viewport.
            rotation={[-DISC_TILT_RAD, 0, 0]}
          >
            <planeGeometry args={[d, d]} />
            <meshBasicMaterial
              map={textures[i]}
              color={col}
              transparent
              opacity={layer.opacity}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </group>
  )
}

export default GalaxyDisc
