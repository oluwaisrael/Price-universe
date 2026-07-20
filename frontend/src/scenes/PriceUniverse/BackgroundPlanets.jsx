import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * BackgroundPlanets
 * Renders 3 large decorative planets in the background to frame the scene.
 * Positioned at strategic locations to match mockup: top-right (blue), bottom-left (gray), top-left (dusty).
 * Each planet has subtle lighting and atmospheric glow.
 */
function BackgroundPlanets() {
  const planet1Ref = useRef() // Top-right, blue
  const planet2Ref = useRef() // Bottom-left, gray
  const planet3Ref = useRef() // Top-left, dusty

  // Planet configurations
  const planets = useMemo(
    () => [
      {
        id: 'planet-1',
        ref: planet1Ref,
        position: [50, 32, -90],
        scale: 8,
        color: '#4a90e2', // Earth-like blue
        emissive: '#2a5db5',
        emissiveIntensity: 0.15,
        roughness: 0.4,
        metalness: 0.1,
        atmColor: '#5ba3ff',
        atmOpacity: 0.08,
      },
      {
        id: 'planet-2',
        ref: planet2Ref,
        position: [-48, -28, -85],
        scale: 6.5,
        color: '#8b8b9a', // Moon-like gray
        emissive: '#4a4a55',
        emissiveIntensity: 0.1,
        roughness: 0.7,
        metalness: 0,
        atmColor: '#a0a0b0',
        atmOpacity: 0.05,
      },
      {
        id: 'planet-3',
        ref: planet3Ref,
        position: [-38, 25, -88],
        scale: 5,
        color: '#c4847a', // Dusty/warm
        emissive: '#7a5a50',
        emissiveIntensity: 0.08,
        roughness: 0.6,
        metalness: 0,
        atmColor: '#d4a49a',
        atmOpacity: 0.04,
      },
    ],
    []
  )

  // Subtle rotation for life
  useFrame(() => {
    if (planet1Ref.current) planet1Ref.current.rotation.y += 0.00008
    if (planet2Ref.current) planet2Ref.current.rotation.y -= 0.00012
    if (planet3Ref.current) planet3Ref.current.rotation.y += 0.0001
  })

  return (
    <group>
      {planets.map((planet) => (
        <group key={planet.id}>
          {/* Main planet sphere */}
          <mesh ref={planet.ref} position={planet.position} scale={planet.scale}>
            <sphereGeometry args={[1, 64, 64]} />
            <meshStandardMaterial
              color={planet.color}
              roughness={planet.roughness}
              metalness={planet.metalness}
              emissive={planet.emissive}
              emissiveIntensity={planet.emissiveIntensity}
            />
          </mesh>

          {/* Atmospheric glow layer */}
          <mesh
            position={planet.position}
            scale={[planet.scale * 1.1, planet.scale * 1.1, planet.scale * 1.1]}
          >
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial
              color={planet.atmColor}
              transparent
              opacity={planet.atmOpacity}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default BackgroundPlanets