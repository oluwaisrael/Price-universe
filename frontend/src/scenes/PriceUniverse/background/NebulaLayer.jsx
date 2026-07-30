import { useMemo } from 'react'
import * as THREE from 'three'

/** Very soft irregular haze — barely noticeable large-scale color */
function makeWispy(seed) {
  const s = 512
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  let r = seed * 12345
  const rnd = () => {
    r = (r * 16807) % 2147483647
    return (r - 1) / 2147483646
  }
  for (let i = 0; i < 22; i++) {
    const cx = rnd() * s
    const cy = rnd() * s
    const rad = s * (0.15 + rnd() * 0.4)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
    const peak = 0.08 + rnd() * 0.12
    g.addColorStop(0, `rgba(255,255,255,${peak})`)
    g.addColorStop(0.4, `rgba(255,255,255,${peak * 0.2})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  }
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

export default function NebulaLayer() {
  const a = useMemo(() => makeWispy(1), [])
  const b = useMemo(() => makeWispy(2), [])

  // Large, low-opacity plates — whole sky tint, no obvious discs
  const plates = [
    { map: a, pos: [-20, 30, -160], color: '#3a2068', scale: [220, 150], o: 0.09 },
    { map: b, pos: [70, 20, -170], color: '#0a4060', scale: [200, 140], o: 0.08 },
    { map: a, pos: [20, -10, -190], color: '#241848', scale: [240, 160], o: 0.05 },
    { map: b, pos: [-80, -5, -150], color: '#2a1840', scale: [180, 120], o: 0.06 },
  ]

  return (
    <group>
      {plates.map((p, i) => (
        <mesh key={i} position={p.pos} renderOrder={-90}>
          <planeGeometry args={p.scale} />
          <meshBasicMaterial
            map={p.map}
            color={p.color}
            transparent
            opacity={p.o}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
