import { useMemo } from 'react'
import * as THREE from 'three'

/** Tiny distant galaxy smudges — sell depth of the universe */
function makeGalaxySmudge() {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  // Soft elongated blob
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.7)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.2)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

export default function DistantGalaxies() {
  const map = useMemo(() => makeGalaxySmudge(), [])

  const galaxies = useMemo(
    () => [
      { pos: [-120, 55, -280], color: '#c8b0ff', scale: [14, 8], rot: 0.4, o: 0.35 },
      { pos: [140, 60, -300], color: '#a0d0ff', scale: [11, 6], rot: -0.6, o: 0.28 },
      { pos: [-160, -40, -290], color: '#ffc8a0', scale: [9, 5], rot: 0.9, o: 0.22 },
      { pos: [100, -55, -310], color: '#b0a0ff', scale: [12, 5.5], rot: -0.3, o: 0.25 },
      { pos: [20, 70, -320], color: '#90c0e8', scale: [7, 4], rot: 0.15, o: 0.2 },
      { pos: [-70, -65, -305], color: '#e0b090', scale: [8, 3.5], rot: -0.8, o: 0.18 },
    ],
    [],
  )

  return (
    <group>
      {galaxies.map((g, i) => (
        <mesh key={i} position={g.pos} rotation={[0, 0, g.rot]} renderOrder={-85}>
          <planeGeometry args={g.scale} />
          <meshBasicMaterial
            map={map}
            color={g.color}
            transparent
            opacity={g.o}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
