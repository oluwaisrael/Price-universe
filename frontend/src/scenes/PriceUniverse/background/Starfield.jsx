import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { hash01 } from '../utils/noise'

function makeRoundStarTex(soft = false) {
  const s = soft ? 64 : 32
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
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
    pos[i * 3] = cx + r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = cy + r * Math.sin(phi) * Math.sin(theta) * 0.7
    pos[i * 3 + 2] = cz + r * Math.cos(phi) + zBias
    const bright = brightMin + hash01(i, 4) * (brightMax - brightMin)
    const tone = hash01(i, 5)
    if (tone > 0.92) {
      col[i * 3] = bright
      col[i * 3 + 1] = bright * 0.9
      col[i * 3 + 2] = bright * 0.78
    } else if (tone < 0.08) {
      col[i * 3] = bright * 0.8
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

function Layer({ data, size, opacity, map }) {
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={data.count} array={data.pos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={data.count} array={data.col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
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

/**
 * Multi-tier stars with slow drift so the background feels alive.
 */
export default function Starfield() {
  const group = useRef()
  const hard = useMemo(() => makeRoundStarTex(false), [])
  const soft = useMemo(() => makeRoundStarTex(true), [])
  const center = [50, 5, -40]

  const far = useMemo(() => buildField(28000, 300, -40, 0.1, 0.4, center), [])
  const mid = useMemo(() => buildField(10000, 200, 0, 0.28, 0.75, center), [])
  const near = useMemo(() => buildField(2500, 120, 30, 0.45, 0.95, center), [])
  const hot = useMemo(() => buildField(400, 100, 40, 0.8, 1.15, center), [])
  const fg = useMemo(() => buildField(100, 70, 55, 0.35, 0.8, center), [])

  // Slow continuous drift — background is no longer static
  useFrame((_, dt) => {
    if (!group.current) return
    group.current.rotation.y += dt * 0.004
    group.current.rotation.x += dt * 0.0012
  })

  return (
    <group ref={group}>
      <Layer data={far} size={0.26} opacity={0.5} map={hard} />
      <Layer data={mid} size={0.48} opacity={0.65} map={hard} />
      <Layer data={near} size={0.8} opacity={0.75} map={hard} />
      <Layer data={hot} size={1.5} opacity={0.85} map={soft} />
      <Layer data={fg} size={4.2} opacity={0.3} map={soft} />
    </group>
  )
}
