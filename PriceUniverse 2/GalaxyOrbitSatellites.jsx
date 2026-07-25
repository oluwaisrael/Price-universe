import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getSatelliteConfig, getDiscTiltRadians } from './galaxyLayout'

/**
 * GalaxyOrbitSatellites — small bright markers that continuously
 * orbit the galaxy core at a few fixed radii (from getSatelliteConfig
 * in galaxyLayout.js), each ring spinning at its own speed/direction.
 * This is purely decorative motion layered on top of the static
 * spiral arm stars — it's what sells "miniature solar system" rather
 * than a flat painted disc. No raycasting, no interaction, no effect
 * on real product node positions or click targets.
 *
 * Positions are recomputed per-frame in local (pre-tilt) space, then
 * rotated through the same disc tilt used everywhere else in the
 * scene so satellites orbit *in the disc's plane*, not a flat XZ
 * circle floating separately from the visible spiral.
 */
function GalaxyOrbitSatellites({ center, color, galaxyRadius }) {
  const rings = useMemo(() => getSatelliteConfig(), [])
  const tilt = useMemo(() => getDiscTiltRadians(), [])
  const groupRefs = useRef([])

  const satellites = useMemo(() => {
    const list = []
    rings.forEach((ring, ringIndex) => {
      for (let i = 0; i < ring.count; i++) {
        list.push({
          ringIndex,
          radius: galaxyRadius * ring.radiusFraction,
          speed: ring.speed,
          size: ring.size,
          angle0: (i / ring.count) * Math.PI * 2,
        })
      }
    })
    return list
  }, [rings, galaxyRadius])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    satellites.forEach((sat, i) => {
      const mesh = groupRefs.current[i]
      if (!mesh) return

      const angle = sat.angle0 + t * sat.speed
      const localX = Math.cos(angle) * sat.radius
      const localZ = Math.sin(angle) * sat.radius

      // Rotate the local orbit-plane point by the disc tilt (same
      // transform as galaxyLayout's tiltDiscPoint, inlined here since
      // this runs every frame and importing the helper for a 2-line
      // rotation isn't worth the coupling).
      const cos = Math.cos(tilt)
      const sin = Math.sin(tilt)
      const y = 0 * cos - localZ * sin
      const z = 0 * sin + localZ * cos

      mesh.position.set(center.x + localX, y, center.z + z)

      // Gentle pulsing scale so satellites don't feel static even
      // when their orbit motion is slow.
      const pulse = 1 + Math.sin(t * 2 + sat.angle0 * 3) * 0.15
      mesh.scale.setScalar(pulse)
    })
  })

  return (
    <group>
      {satellites.map((sat, i) => (
        <mesh key={i} ref={(el) => (groupRefs.current[i] = el)}>
          <sphereGeometry args={[sat.size, 12, 12]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  )
}

export default GalaxyOrbitSatellites
