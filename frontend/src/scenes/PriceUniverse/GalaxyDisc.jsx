import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * GalaxyDisc — the primary visual base of each galaxy.
 *
 * Architecture insight from the reference mockup:
 * The mockup shows a strongly ELLIPTICAL glowing object — not a circle
 * viewed top-down, but a disc viewed at ~35° from edge-on. This means
 * the disc planes need to be significantly narrower on one axis (the
 * depth axis) to read as a tilted disc from camera position.
 *
 * The mockup has:
 *  - A nearly-solid glowing core region (~40% of disc width)
 *  - 4-5 distinct concentric bright OVAL rings (the spiral arms viewed
 *    at angle look like rings when the disc is strongly tilted)
 *  - Exponential falloff from bright center to dark edge
 *  - No visible circular boundary (edges fully feathered to 0)
 *  - The entire disc reads as one luminous object, not a particle spiral
 *
 * Implementation: 8 stacked PlaneGeometry meshes with AdditiveBlending,
 * each tilted to match the disc inclination, with canvas-generated
 * textures. Non-uniform XY scale (wide × narrow) gives the elliptical
 * shape that reads as a tilted disc.
 */

const DISC_TILT_RAD = (58 * Math.PI) / 180

// Generates a disc texture with concentric ring bands.
// The "rings" in the mockup are actually spiral arms seen through a
// tilted disc — when viewed at angle, the spiral arms compress into
// what appear as concentric elliptical bands.
function makeDiscTex({
  size      = 1024,
  noiseSeed = 1,
  noiseStr  = 0.5,
  rings     = [],       // [{r: 0..1, width: 0..1, alpha: 0..1}]
  corePow   = 2.5,      // higher = tighter bright core
  baseAlpha = 0.8,
} = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const cx = size / 2, cy = size / 2, cr = size / 2

  // ── BASE RADIAL GLOW ──────────────────────────────────────────────
  // Exponential falloff — the "power" parameter controls how tight the
  // bright region is. corePow=2.5 means the outer 60% of the disc is
  // very dim; corePow=1.2 makes a shallower, more uniform glow.
  const imgData = ctx.createImageData(size, size)
  const data = imgData.data

  // LCG seed for reproducible per-pixel noise
  let s = (noiseSeed * 1664525 + 1013904223) >>> 0
  const lcg = () => { s = (s * 1664525 + 1013904223) >>> 0; return (s >>> 0) / 4294967295 }

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = (px - cx) / cr   // -1 .. 1
      const dy = (py - cy) / cr
      const dist = Math.sqrt(dx*dx + dy*dy)  // 0 at center, 1 at edge

      if (dist > 1) { lcg(); continue }

      // Base exponential falloff
      let alpha = Math.pow(Math.max(0, 1 - dist), corePow) * baseAlpha

      // Add ring contributions
      for (const ring of rings) {
        const ringDist = Math.abs(dist - ring.r)
        if (ringDist < ring.width) {
          const ringAlpha = ring.alpha * Math.pow(1 - ringDist / ring.width, 1.8)
          alpha = Math.min(1, alpha + ringAlpha)
        }
      }

      // Noise — strongest at outer radius (dist > 0.5) to break
      // the circular boundary without muddying the bright core
      const n = lcg()
      const noiseFactor = noiseStr * Math.pow(Math.max(0, dist - 0.35), 2.0)
      alpha = Math.max(0, alpha * (1 - n * noiseFactor))

      const idx = (py * size + px) * 4
      data[idx]     = 255
      data[idx + 1] = 255
      data[idx + 2] = 255
      data[idx + 3] = Math.round(Math.min(1, alpha) * 255)
    }
  }

  ctx.putImageData(imgData, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// ── LAYER DEFINITIONS ────────────────────────────────────────────────
// Each layer is one PlaneGeometry. The "sx" and "sz" props control the
// non-uniform scale — sx is the wide axis (galactic longitude), sz is
// the compressed axis (galactic latitude as seen at the disc tilt). At
// 58° tilt, the depth axis compresses to roughly cos(58°) ≈ 0.53 of
// the face-on radius. Scale factors are relative to GALAXY_RADIUS.
//
// Layer order (bottom to top, i.e. first rendered to last):
//   0. Outer corona    — very wide, very faint
//   1. Main disc glow  — primary elliptical glow body
//   2. Ring layer A    — outer 3 rings (spiral arms at angle)
//   3. Ring layer B    — inner 3 rings (tighter arm zone)
//   4. Bright inner    — tight bright core transition
//   5. Core corona     — very small, very bright, no rings
//   6. Nucleus spot    — white-hot center

const LAYERS = [
  {
    // 0 — Outer corona: the "glow field" extending well past the arms
    sxMult: 2.4, szMult: 1.25, opacity: 0.28,
    texOpts: { noiseStr: 0.92, noiseSeed: 1, corePow: 1.1, baseAlpha: 0.5, rings: [] },
  },
  {
    // 1 — Main disc body: this is the primary "solid glowing oval"
    sxMult: 1.7, szMult: 0.90, opacity: 0.55,
    texOpts: { noiseStr: 0.75, noiseSeed: 2, corePow: 1.6, baseAlpha: 0.75, rings: [] },
  },
  {
    // 2 — Outer rings A: the bright oval bands (spiral arms at angle)
    sxMult: 1.4, szMult: 0.74, opacity: 0.62,
    texOpts: {
      noiseStr: 0.55, noiseSeed: 3, corePow: 2.2, baseAlpha: 0.5,
      rings: [
        { r: 0.88, width: 0.06, alpha: 0.55 },
        { r: 0.74, width: 0.07, alpha: 0.60 },
        { r: 0.60, width: 0.08, alpha: 0.65 },
      ],
    },
  },
  {
    // 3 — Inner rings B: tighter arm zone, brighter
    sxMult: 1.0, szMult: 0.53, opacity: 0.70,
    texOpts: {
      noiseStr: 0.40, noiseSeed: 4, corePow: 2.8, baseAlpha: 0.65,
      rings: [
        { r: 0.46, width: 0.09, alpha: 0.70 },
        { r: 0.30, width: 0.10, alpha: 0.75 },
        { r: 0.16, width: 0.11, alpha: 0.65 },
      ],
    },
  },
  {
    // 4 — Inner bright transition
    sxMult: 0.52, szMult: 0.28, opacity: 0.80,
    texOpts: { noiseStr: 0.22, noiseSeed: 5, corePow: 3.5, baseAlpha: 0.85, rings: [] },
  },
  {
    // 5 — Core corona
    sxMult: 0.20, szMult: 0.11, opacity: 0.90,
    texOpts: { noiseStr: 0.08, noiseSeed: 6, corePow: 4.5, baseAlpha: 1.0, rings: [] },
  },
  {
    // 6 — White nucleus spot — bloom blows this out to a wide core halo
    sxMult: 0.07, szMult: 0.04, opacity: 1.0,
    texOpts: { noiseStr: 0.0, noiseSeed: 7, corePow: 6.0, baseAlpha: 1.0, rings: [] },
  },
]

function GalaxyDisc({ center, color, radius }) {
  const meshRefs = useRef([])
  const col = useMemo(() => new THREE.Color(color), [color])

  // Build textures once — they're expensive (per-pixel JS loop).
  // 1024px for the main ring layers, 512px for the simpler glow layers.
  const textures = useMemo(() => {
    return LAYERS.map((layer, i) => {
      const size = (i === 2 || i === 3) ? 1024 : 512
      return makeDiscTex({ size, ...layer.texOpts })
    })
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const breathe = Math.sin(t * 0.35) * 0.5 + 0.5
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh?.material) return
      // Inner layers pulse slightly brighter than outer — the core
      // "powers" the rest of the disc visually.
      const inner = i / (LAYERS.length - 1)
      const pulseAmt = 0.06 + inner * 0.08
      mesh.material.opacity = LAYERS[i].opacity * (1 - pulseAmt + breathe * pulseAmt)
    })
  })

  const cx = center.x, cz = center.z

  return (
    <group>
      {LAYERS.map((layer, i) => {
        // Non-uniform scale: wide on X (galactic longitude), compressed
        // on Z (galactic latitude foreshortened by disc tilt). This is
        // what produces the elliptical shape — a circle that would be
        // round face-on reads as an oval when viewed at 58° tilt.
        const sx = radius * layer.sxMult * 2
        // The Z extent: apply the tilt compression so the disc reads
        // correctly from camera (at roughly y=20 looking toward z=-21).
        // cos(DISC_TILT_RAD) ≈ 0.53 — that's the natural compression;
        // we exaggerate it slightly to match the mockup's oval aspect.
        const sz = radius * layer.szMult * 2

        return (
          <mesh
            key={i}
            ref={(el) => { meshRefs.current[i] = el }}
            position={[cx, -0.5 + i * 0.08, cz]}
            rotation={[-DISC_TILT_RAD, 0, 0]}
          >
            <planeGeometry args={[sx, sz]} />
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
