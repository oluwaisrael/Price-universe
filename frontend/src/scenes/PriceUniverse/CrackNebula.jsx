import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * CrackNebula — creates fractal-looking "cracks in space" — thin,
 * branching tendrils of glowing purple/magenta gas that look like
 * rifts or tears in the fabric of space.
 *
 * Technique: each "crack" is a series of overlapping elongated sprites
 * at different scales/orientations, plus a thinner bright core sprite
 * on top. No geometry that reveals itself as a shape — pure layered
 * additive sprites with aggressive alpha noise so they look organic.
 */

function makeCrackTex({ seed = 1, length = 0.85, brightness = 0.9 } = {}) {
  const w = 512, h = 128
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  const cx = w / 2, cy = h / 2

  // Elongated linear glow — tapers to 0 at both ends (no hard edge),
  // bright in the middle, softly fades toward edges on the short axis.
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(cx, cy))
  grad.addColorStop(0, `rgba(255,255,255,${brightness})`)
  grad.addColorStop(0.3, `rgba(200,100,255,${brightness * 0.6})`)
  grad.addColorStop(0.7, `rgba(120,20,200,${brightness * 0.2})`)
  grad.addColorStop(1, 'rgba(0,0,0,0)')

  // Clip to elongated region — make it a crack not a blob
  const clipW = w * length, clipH = h * 0.35
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, cy, clipW/2, clipH/2, 0, 0, Math.PI*2)
  ctx.clip()
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  // Per-pixel noise along the EDGES only — the center stays bright
  // and clean, the edges become ragged and organic.
  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data
  let s = (seed * 1664525 + 1013904223) >>> 0
  const lcg = () => { s=(s*1664525+1013904223)>>>0; return (s>>>0)/4294967295 }

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 10) continue
    const px = (i/4) % w, py = Math.floor((i/4)/w)
    const edgeX = Math.abs(px - cx) / (clipW/2)
    const edgeY = Math.abs(py - cy) / (clipH/2)
    const edgeDist = Math.max(edgeX, edgeY)
    const noiseAmt = Math.pow(Math.max(0, edgeDist - 0.3), 1.5) * 0.95
    data[i] = Math.max(0, Math.round(data[i] * (1 - lcg() * noiseAmt)))
  }
  ctx.putImageData(imgData, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// Configuration for each individual crack streak
const CRACKS = [
  // Top-left cluster — large sweeping cracks
  { pos: [-35, 22, -55], rot: [0, 0,  0.62], scale: [88, 14, 1], opacity: 0.38, seed: 1, color: '#9933ff' },
  { pos: [-42, 18, -48], rot: [0, 0,  0.85], scale: [60, 9,  1], opacity: 0.28, seed: 2, color: '#cc44ff' },
  { pos: [-28, 28, -62], rot: [0, 0,  0.38], scale: [70, 8,  1], opacity: 0.22, seed: 3, color: '#7722dd' },
  // Branch off main crack
  { pos: [-44, 32, -50], rot: [0, 0,  1.20], scale: [40, 6,  1], opacity: 0.20, seed: 4, color: '#aa33ee' },
  { pos: [-30, 14, -58], rot: [0, 0, -0.35], scale: [50, 7,  1], opacity: 0.25, seed: 5, color: '#8844cc' },

  // Top-center — smaller cracks near blackhole
  { pos: [-18, 35, -70], rot: [0, 0,  0.90], scale: [55, 8,  1], opacity: 0.30, seed: 6, color: '#bb55ff' },
  { pos: [-10, 40, -75], rot: [0, 0,  1.45], scale: [35, 5,  1], opacity: 0.18, seed: 7, color: '#9944dd' },

  // Right side — thinner tendrils going across background
  { pos: [8,  45, -80], rot: [0, 0, -0.22], scale: [75, 7,  1], opacity: 0.20, seed: 8,  color: '#7733cc' },
  { pos: [15, 38, -72], rot: [0, 0,  0.15], scale: [50, 6,  1], opacity: 0.16, seed: 9,  color: '#9922bb' },

  // Deep background — very large, very faint sweeping arcs
  { pos: [-15, 52, -95], rot: [0, 0,  0.50], scale: [120, 16, 1], opacity: 0.14, seed: 10, color: '#6622aa' },
  { pos: [-5,  48, -88], rot: [0, 0, -0.30], scale: [90,  11, 1], opacity: 0.12, seed: 11, color: '#8833bb' },
  { pos: [-25, 58, -102],rot: [0, 0,  0.75], scale: [80,  10, 1], opacity: 0.10, seed: 12, color: '#5511aa' },

  // Extra thin bright accent cracks
  { pos: [-38, 24, -52], rot: [0, 0,  0.65], scale: [30, 2.5, 1], opacity: 0.55, seed: 13, color: '#ddaaff' },
  { pos: [-20, 30, -65], rot: [0, 0,  0.92], scale: [22, 2,   1], opacity: 0.48, seed: 14, color: '#eeccff' },
  { pos: [-14, 38, -73], rot: [0, 0,  1.38], scale: [18, 2,   1], opacity: 0.40, seed: 15, color: '#cc99ff' },
]

function CrackNebula() {
  // Build a few textures — reused across cracks for perf
  const textures = useMemo(() => [
    makeCrackTex({ seed: 1, brightness: 0.88 }),
    makeCrackTex({ seed: 2, brightness: 0.70 }),
    makeCrackTex({ seed: 3, length: 0.92, brightness: 0.60 }),
    makeCrackTex({ seed: 4, length: 0.78, brightness: 0.95 }), // bright core
  ], [])

  return (
    <>
      {CRACKS.map((crack, i) => {
        // Alternate between textures for variety
        const tex = textures[i % textures.length]
        const col = new THREE.Color(crack.color)
        return (
          <sprite
            key={i}
            position={crack.pos}
            rotation={crack.rot}
            scale={crack.scale}
          >
            <spriteMaterial
              map={tex}
              color={col}
              transparent
              opacity={crack.opacity}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
        )
      })}
    </>
  )
}

export default CrackNebula
