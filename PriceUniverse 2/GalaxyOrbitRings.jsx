import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getDiscTiltRadians } from './galaxyLayout'

/**
 * GalaxyOrbitRings — despite the name (kept for import compatibility),
 * this no longer draws concentric ring circles. It traces 5 logarithmic
 * spiral arm curves using the same radius/angle formula as the real
 * product placement in galaxyLayout.js's spiralPosition() (radius =
 * CORE + sqrt(t) * (MAX-CORE), angle = armOffset + t * turns * 2π), so
 * the visible curves actually match the arms products sit on instead
 * of being a decorative, unrelated set of perfect circles.
 *
 * Built as Line2-style thin tube-free polylines (BufferGeometry +
 * Line) rather than TubeGeometry, since a flat additive-blended line
 * reads as a soft glowing thread at this scale without the extra
 * geometry cost of a tube mesh per arm.
 */
const ARM_VISUAL_COUNT = 5
const SPIRAL_TURNS_VISUAL = 2.1 // kept in sync with galaxyLayout.js SPIRAL_TURNS
const CORE_RADIUS_VISUAL = 0.6
const SEGMENTS_PER_ARM = 96
const ROTATION_SPEEDS = [0.012, -0.008, 0.015, -0.01, 0.009]
const BASE_OPACITIES = [0.26, 0.2, 0.22, 0.16, 0.18]

function buildArmPoints(armIndex, galaxyRadius) {
  const points = []
  const armOffset = (armIndex / ARM_VISUAL_COUNT) * Math.PI * 2

  for (let i = 0; i <= SEGMENTS_PER_ARM; i++) {
    const t = i / SEGMENTS_PER_ARM
    const radius = CORE_RADIUS_VISUAL + Math.sqrt(t) * (galaxyRadius - CORE_RADIUS_VISUAL)
    const angle = armOffset + t * SPIRAL_TURNS_VISUAL * Math.PI * 2
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
  }

  return points
}

function GalaxyOrbitRings({ center, color, galaxyRadius = 14 }) {
  const materialColor = useMemo(() => new THREE.Color(color), [color])
  const tilt = getDiscTiltRadians()
  const lineRefs = useRef([])
  const materialRefs = useRef([])

  const armGeometries = useMemo(() => {
    return Array.from({ length: ARM_VISUAL_COUNT }, (_, i) => {
      const points = buildArmPoints(i, galaxyRadius)
      return new THREE.BufferGeometry().setFromPoints(points)
    })
  }, [galaxyRadius])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < ARM_VISUAL_COUNT; i++) {
      const line = lineRefs.current[i]
      if (line) line.rotation.z += ROTATION_SPEEDS[i] * delta

      const mat = materialRefs.current[i]
      if (mat) {
        const flicker = Math.sin(t * 0.6 + i * 1.3) * 0.05
        mat.opacity = BASE_OPACITIES[i] + flicker
      }
    }
  })

  return (
    <group
      position={[center.x, -0.4, center.z]}
      rotation={[-Math.PI / 2 + tilt, 0, 0]}
    >
      {armGeometries.map((geometry, i) => (
        <primitive
          key={i}
          object={new THREE.Line(
            geometry,
            new THREE.LineBasicMaterial({
              color: materialColor,
              transparent: true,
              opacity: BASE_OPACITIES[i],
              toneMapped: false,
              blending: THREE.AdditiveBlending,
            })
          )}
          ref={(el) => {
            lineRefs.current[i] = el
            if (el) materialRefs.current[i] = el.material
          }}
          renderOrder={2}
        />
      ))}
    </group>
  )
}

export default GalaxyOrbitRings
