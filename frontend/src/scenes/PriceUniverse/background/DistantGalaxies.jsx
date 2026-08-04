import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/** Tiny distant galaxy smudges — sell depth of the universe */
function makeGalaxySmudge() {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
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
  const group = useRef()
  const map = useMemo(() => makeGalaxySmudge(), [])

  const galaxies = useMemo(
    () => [
      { pos: [-120, 55, -280], color: '#c8b0ff', scale: [18, 10], rot: 0.4, o: 0.38 },
      { pos: [140, 60, -300], color: '#70c8ff', scale: [15, 8], rot: -0.6, o: 0.32 },
      { pos: [-160, -40, -290], color: '#ffc8a0', scale: [12, 7], rot: 0.9, o: 0.26 },
      { pos: [100, -55, -310], color: '#b0a0ff', scale: [16, 7], rot: -0.3, o: 0.3 },
      { pos: [20, 70, -320], color: '#90c0e8', scale: [10, 5], rot: 0.15, o: 0.24 },
      { pos: [-70, -65, -305], color: '#e0b090', scale: [11, 5], rot: -0.8, o: 0.22 },
      { pos: [-200, 30, -340], color: '#a080ff', scale: [20, 9], rot: 0.5, o: 0.2 },
      { pos: [180, -20, -350], color: '#60b0e0', scale: [14, 6], rot: -0.4, o: 0.18 },
      { pos: [50, -80, -330], color: '#d0a0ff', scale: [13, 6], rot: 0.7, o: 0.16 },
    ],
    [],
  )

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.0025
  })

  return (
    <group ref={group}>
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
