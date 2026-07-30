import { useMemo } from 'react'
import * as THREE from 'three'
import { hash01 } from '../utils/noise'

function makeRoundStarTex() {
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, s, s)
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2 - 1)
  g.addColorStop(0.0, 'rgba(255,255,255,1)')
  g.addColorStop(0.15, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.25)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.04)')
  g.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

/** Fast spherical-ish distribution — no rejection loops */
function buildField(count, radius, zBias, brightMin, brightMax) {
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const cx = 40
  const cy = 5
  const cz = -40

  for (let i = 0; i < count; i++) {
    // Spherical coordinates from hash (always valid, no while-loop)
    const u = hash01(i, 1)
    const v = hash01(i, 2)
    const theta = u * Math.PI * 2
    const phi = Math.acos(2 * v - 1) // uniform on sphere
    const r = radius * Math.cbrt(hash01(i, 3)) // denser toward center volume

    pos[i * 3] = cx + r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = cy + r * Math.sin(phi) * Math.sin(theta) * 0.65
    pos[i * 3 + 2] = cz + r * Math.cos(phi) + zBias

    const bright = brightMin + hash01(i, 4) * (brightMax - brightMin)
    const tone = hash01(i, 5)
    if (tone > 0.92) {
      col[i * 3] = bright
      col[i * 3 + 1] = bright * 0.9
      col[i * 3 + 2] = bright * 0.78
    } else if (tone < 0.08) {
      col[i * 3] = bright * 0.82
      col[i * 3 + 1] = bright * 0.9
      col[i * 3 + 2] = bright
    } else {
      col[i * 3] = bright * 0.93
      col[i * 3 + 1] = bright * 0.95
      col[i * 3 + 2] = bright
    }
  }
  return { pos, col, count }
}

function Layer({ data, baseSize, opacity, map }) {
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={data.count} array={data.pos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={data.count} array={data.col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={baseSize}
        vertexColors
        map={map}
        alphaMap={map}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

export default function Starfield() {
  const map = useMemo(() => makeRoundStarTex(), [])
  // Leaner budgets — still dense, won't freeze main thread
  const dense = useMemo(() => buildField(25000, 260, -20, 0.15, 0.55), [])
  const mid = useMemo(() => buildField(8000, 180, 0, 0.35, 0.85), [])
  const bright = useMemo(() => buildField(1200, 140, 10, 0.7, 1.2), [])

  return (
    <group>
      <Layer data={dense} baseSize={0.45} opacity={0.75} map={map} />
      <Layer data={mid} baseSize={0.7} opacity={0.8} map={map} />
      <Layer data={bright} baseSize={1.15} opacity={0.9} map={map} />
    </group>
  )
}
