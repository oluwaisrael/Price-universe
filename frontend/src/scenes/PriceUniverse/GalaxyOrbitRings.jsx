import { useMemo } from 'react'
import * as THREE from 'three'

const RING_RADII_FRACTIONS = [0.3, 0.55, 0.85]
const RING_THICKNESS = 0.04

function GalaxyOrbitRings({ center, color, galaxyRadius = 14 }) {
  const materialColor = useMemo(() => new THREE.Color(color), [color])

  return (
    <group position={[center.x, -0.4, center.z]} rotation={[-Math.PI / 2, 0, 0]}>
      {RING_RADII_FRACTIONS.map((fraction, i) => {
        const radius = galaxyRadius * fraction
        return (
          <mesh key={i} renderOrder={-1}>
            <ringGeometry
              args={[radius - RING_THICKNESS, radius + RING_THICKNESS, 64]}
            />
            <meshBasicMaterial
              color={materialColor}
              transparent
              opacity={0.14}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}

export default GalaxyOrbitRings
