import { useMemo } from 'react'
import * as THREE from 'three'

/** Warm light bleed from the galaxy into nearby space */
export default function GalaxySpill({ position = [48, 0, -12], color = '#ff8a30', radius = 55 }) {
  const map = useMemo(() => {
    const s = 256
    const c = document.createElement('canvas')
    c.width = c.height = s
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
    g.addColorStop(0, 'rgba(255,255,255,0.35)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.08)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
    const t = new THREE.CanvasTexture(c)
    t.needsUpdate = true
    return t
  }, [])

  return (
    <mesh position={position} renderOrder={-50}>
      <planeGeometry args={[radius * 3.2, radius * 2.4]} />
      <meshBasicMaterial
        map={map}
        color={color}
        transparent
        opacity={0.06}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}
