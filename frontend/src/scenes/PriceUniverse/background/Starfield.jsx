import { useMemo } from 'react'
import * as THREE from 'three'
import { hash01 } from '../utils/noise'

function makeRoundStarTex(soft = false) {
  const s = soft ? 64 : 32
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
  if (soft) {
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.2, 'rgba(255,255,255,0.35)')
    g.addColorStop(0.55, 'rgba(255,255,255,0.06)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
  } else {
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.2, 'rgba(255,255,255,0.5)')
    g.addColorStop(0.55, 'rgba(255,255,255,0.06)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

function buildField(count, radius, zBias, brightMin, brightMax, center) {
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const [cx, cy, cz] = center
  for (let i = 0; i < count; i++) {
    const u = hash01(i, 1)
    const v = hash01(i, 2)
    const theta = u * Math.PI * 2
    const phi = Math.acos(2 * v - 1)
    const r = radius * Math.cbrt(hash01(i, 3))
    pos[i*3] = cx + r * Math.sin(phi) * Math.cos(theta)
    pos[i*3+1] = cy + r * Math.sin(phi) * Math.sin(theta) * 0.7
    pos[i*3+2] = cz + r * Math.cos(phi) + zBias
    const bright = brightMin + hash01(i, 4) * (brightMax - brightMin)
    const tone = hash01(i, 5)
    if (tone > 0.92) { col[i*3]=bright; col[i*3+1]=bright*0.9; col[i*3+2]=bright*0.78 }
    else if (tone < 0.08) { col[i*3]=bright*0.8; col[i*3+1]=bright*0.9; col[i*3+2]=bright }
    else { col[i*3]=bright*0.93; col[i*3+1]=bright*0.95; col[i*3+2]=bright }
  }
  return { pos, col, count }
}

function Layer({ data, size, opacity, map }) {
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={data.count} array={data.pos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={data.count} array={data.col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={size} vertexColors map={map} alphaMap={map}
        transparent opacity={opacity} sizeAttenuation depthWrite={false}
        blending={THREE.AdditiveBlending} toneMapped={false}
      />
    </points>
  )
}

/**
 * Multi-tier stars for depth:
 * far tiny crisp · mid · near soft large · few hot bloom
 */
export default function Starfield() {
  const hard = useMemo(() => makeRoundStarTex(false), [])
  const soft = useMemo(() => makeRoundStarTex(true), [])
  const center = [40, 5, -40]

  const far = useMemo(() => buildField(28000, 300, -40, 0.12, 0.45, center), [])
  const mid = useMemo(() => buildField(10000, 200, 0, 0.3, 0.8, center), [])
  const near = useMemo(() => buildField(2500, 120, 30, 0.5, 1.0, center), [])
  const hot = useMemo(() => buildField(400, 100, 40, 0.85, 1.2, center), [])
  // Huge soft foreground stars (out-of-focus depth sellers)
  const fg = useMemo(() => buildField(120, 70, 55, 0.4, 0.9, center), [])

  return (
    <group>
      <Layer data={far} size={0.28} opacity={0.55} map={hard} />
      <Layer data={mid} size={0.5} opacity={0.7} map={hard} />
      <Layer data={near} size={0.85} opacity={0.8} map={hard} />
      <Layer data={hot} size={1.6} opacity={0.9} map={soft} />
      <Layer data={fg} size={4.5} opacity={0.35} map={soft} />
    </group>
  )
}
