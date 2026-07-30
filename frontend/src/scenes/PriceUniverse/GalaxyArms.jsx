import { useMemo } from 'react'
import * as THREE from 'three'
import { getGalaxyRadius, getDiscTiltRadians } from './galaxyLayout'

/**
 * Cinematic arm ribbons — continuous soft light bands, not particle curves.
 *
 * Each arm = chain of elongated additive sprites along a log spiral.
 * Overlapping soft textures hide individual elements → reads as one volume.
 */

const ARM_COUNT = 2
const SEGMENTS_PER_ARM = 48
const SPIRAL_TURNS = 1.05

function makeRibbonTexture() {
  const w = 256
  const h = 128
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  // Soft horizontal band — bright center, falloff on long edges
  for (let y = 0; y < h; y++) {
    const v = Math.abs(y / h - 0.5) * 2
    const a = Math.pow(1 - Math.min(v, 1), 2.2)
    ctx.fillStyle = `rgba(255,255,255,${a})`
    ctx.fillRect(0, y, w, 1)
  }
  // Soft fade on ends
  const gL = ctx.createLinearGradient(0, 0, w * 0.2, 0)
  gL.addColorStop(0, 'rgba(0,0,0,1)')
  gL.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = gL
  ctx.fillRect(0, 0, w * 0.2, h)
  const gR = ctx.createLinearGradient(w, 0, w * 0.8, 0)
  gR.addColorStop(0, 'rgba(0,0,0,1)')
  gR.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gR
  ctx.fillRect(w * 0.8, 0, w * 0.2, h)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function makeSoftBlobTexture() {
  const s = 128
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.06)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function hash(i, salt) {
  let h = (i * 374761393 + salt * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

/**
 * GalaxyArms — wide glowing ribbons + soft dust blobs in the arm volume.
 */
export default function GalaxyArms({ center, color, radius }) {
  const ribbonTex = useMemo(() => makeRibbonTexture(), [])
  const blobTex = useMemo(() => makeSoftBlobTexture(), [])
  const col = useMemo(() => new THREE.Color(color), [color])
  const tilt = getDiscTiltRadians()

  const { ribbons, blobs } = useMemo(() => {
    const R = radius
    const r0 = R * 0.06
    const k = (SPIRAL_TURNS * Math.PI * 2) / Math.log(R / r0)
    const ribbons = []
    const blobs = []

    for (let arm = 0; arm < ARM_COUNT; arm++) {
      const armOffset = (arm / ARM_COUNT) * Math.PI * 2 + (hash(arm, 3) - 0.5) * 0.15

      for (let i = 0; i < SEGMENTS_PER_ARM; i++) {
        const t = i / (SEGMENTS_PER_ARM - 1)
        // Skip deepest core — core sprites own that
        if (t < 0.06) continue

        const radiusT = r0 + Math.pow(t, 0.78) * (R - r0)
        const theta = armOffset + k * Math.log(radiusT / r0)

        // Width of ribbon grows with radius (broad outer arms)
        const width = R * (0.22 + 0.38 * t)
        const length = R * (0.12 + 0.06 * t)

        // Position in disc plane then tilt
        let x = Math.cos(theta) * radiusT
        let z = Math.sin(theta) * radiusT
        let y = 0
        const cos = Math.cos(tilt)
        const sin = Math.sin(tilt)
        const ty = y * cos - z * sin
        const tz = y * sin + z * cos

        // Density variation — some segments dimmer (organic)
        const dens = 0.55 + 0.45 * Math.sin(t * Math.PI)
        const gap = Math.sin(t * 9 + arm * 2) > 0.92 ? 0.35 : 1
        const opacity = dens * gap * (0.35 + 0.5 * (1 - t * 0.3))

        ribbons.push({
          key: `r-${arm}-${i}`,
          position: [center.x + x, ty, center.z + tz],
          // Face roughly along tangent
          rotation: [-Math.PI / 2 + tilt * 0.3, 0, theta + Math.PI / 2],
          scale: [length, width, 1],
          opacity: Math.min(0.75, opacity),
        })

        // Extra soft blobs around ribbon for volume (not on centerline only)
        for (let b = 0; b < 3; b++) {
          const side = (hash(i * 10 + b, arm) - 0.5) * width * 0.85
          const along = (hash(i * 10 + b, arm + 7) - 0.5) * length * 0.4
          const px = x + Math.cos(theta + Math.PI / 2) * side + Math.cos(theta) * along
          const pz = z + Math.sin(theta + Math.PI / 2) * side + Math.sin(theta) * along
          const py = (hash(i + b, 99) - 0.5) * R * 0.08
          const ty2 = py * cos - pz * sin
          const tz2 = py * sin + pz * cos
          const bs = width * (0.35 + hash(i + b, 11) * 0.4)
          blobs.push({
            key: `b-${arm}-${i}-${b}`,
            position: [center.x + px, ty2, center.z + tz2],
            scale: bs,
            opacity: 0.08 + hash(i + b, 5) * 0.12,
          })
        }
      }
    }
    return { ribbons, blobs }
  }, [center.x, center.z, radius, tilt])

  return (
    <group>
      {ribbons.map((r) => (
        <mesh
          key={r.key}
          position={r.position}
          rotation={r.rotation}
          scale={r.scale}
          renderOrder={-8}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={ribbonTex}
            color={col}
            transparent
            opacity={r.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {blobs.map((b) => (
        <mesh
          key={b.key}
          position={b.position}
          scale={[b.scale, b.scale, b.scale]}
          renderOrder={-7}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={blobTex}
            color={col}
            transparent
            opacity={b.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            depthTest
          />
        </mesh>
      ))}
    </group>
  )
}
