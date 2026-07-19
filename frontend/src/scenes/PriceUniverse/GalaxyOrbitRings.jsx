import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getDiscTiltRadians } from './galaxyLayout'

/**
 * GalaxyOrbitRings — 3 faint concentric flat rings around a galaxy
 * center, evoking the mockup's visible orbit paths. Purely
 * decorative: no interaction, no raycasting relevance. Built with
 * RingGeometry (a flat annulus), laid flat on XZ then tilted to match
 * the spiral disc's inclination (see galaxyLayout.js DISC_TILT_RAD)
 * so the rings look like they belong to the same tilted galaxy plane
 * instead of floating flat underneath it.
 *
 * Each ring now spins slowly around the disc's own normal axis at a
 * distinct speed (rotationSpeeds), and its opacity breathes gently —
 * both purely cosmetic per-frame updates on refs, no state/rerenders.
 */
const RING_RADII_FRACTIONS = [0.3, 0.55, 0.85]
const RING_THICKNESS_FRACTION = 0.025
const ROTATION_SPEEDS = [0.03, -0.02, 0.015]
const BASE_OPACITIES = [0.45, 0.35, 0.25]

function GalaxyOrbitRings({ center, color, galaxyRadius = 14 }) {
  const materialColor = useMemo(() => new THREE.Color(color), [color])
  const tilt = getDiscTiltRadians()
  const ringRefs = useRef([])
  const materialRefs = useRef([])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    RING_RADII_FRACTIONS.forEach((_, i) => {
      const mesh = ringRefs.current[i]
      if (mesh) mesh.rotation.z += ROTATION_SPEEDS[i] * delta

      const mat = materialRefs.current[i]
      if (mat) {
        const flicker = Math.sin(t * 0.6 + i * 1.7) * 0.05
        mat.opacity = BASE_OPACITIES[i] + flicker
      }
    })
  })

  return (
    <group
      position={[center.x, -0.4, center.z]}
      rotation={[-Math.PI / 2 + tilt, 0, 0]}
    >
      {RING_RADII_FRACTIONS.map((fraction, i) => {
        const radius = galaxyRadius * fraction
        return (
          <mesh key={i} ref={(el) => (ringRefs.current[i] = el)} renderOrder={2}>
            <ringGeometry
              args={[radius - galaxyRadius * RING_THICKNESS_FRACTION, radius + galaxyRadius * RING_THICKNESS_FRACTION, 64]}
            />
            <meshBasicMaterial
              ref={(el) => (materialRefs.current[i] = el)}
              color={materialColor}
              transparent
              opacity={BASE_OPACITIES[i]}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )
      })}
    </group>
  )
}

export default GalaxyOrbitRings
