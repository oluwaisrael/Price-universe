import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { TextureLoader } from 'three'

/**
 * BackgroundPlanets - REAL IMAGES FROM NASA
 */
function BackgroundPlanets() {
  const mercuryRef = useRef()
  const venusRef = useRef()
  const earthRef = useRef()
  const marsRef = useRef()
  const jupiterRef = useRef()

  // Load textures
  const textureLoader = useMemo(() => new TextureLoader(), [])

  const planets = useMemo(
    () => [
      {
        id: 'mercury',
        ref: mercuryRef,
        position: [80, 50, -100],
        scale: 6,
        texturePath: '/textures/mercury.jpg',
        glowColor: '#999999',
        glowIntensity: 0.4,
      },
      {
        id: 'venus',
        ref: venusRef,
        position: [-80, 60, -130],
        scale: 9,
        texturePath: '/textures/venus.jpg',
        glowColor: '#fbbf24',
        glowIntensity: 0.6,
      },
      {
        id: 'earth',
        ref: earthRef,
        position: [0, -45, -105],
        scale: 9.5,
        texturePath: '/textures/earth.jpg',
        glowColor: '#0ea5e9',
        glowIntensity: 0.65,
      },
      {
        id: 'mars',
        ref: marsRef,
        position: [60, -40, -95],
        scale: 7,
        texturePath: '/textures/mars.jpg',
        glowColor: '#f87171',
        glowIntensity: 0.5,
      },
      {
        id: 'jupiter',
        ref: jupiterRef,
        position: [-90, -55, -125],
        scale: 20,
        texturePath: '/textures/jupiter.jpg',
        glowColor: '#fb923c',
        glowIntensity: 0.7,
      },
    ],
    []
  )

  // Load all textures
  const loadedTextures = useMemo(() => {
    const textures = {}
    planets.forEach((planet) => {
      textureLoader.load(planet.texturePath, (texture) => {
        textures[planet.id] = texture
      })
    })
    return textures
  }, [planets, textureLoader])

  useFrame(() => {
    if (mercuryRef.current) mercuryRef.current.rotation.y += 0.0001
    if (venusRef.current) venusRef.current.rotation.y -= 0.00008
    if (earthRef.current) earthRef.current.rotation.y += 0.00012
    if (marsRef.current) marsRef.current.rotation.y += 0.00014
    if (jupiterRef.current) jupiterRef.current.rotation.y += 0.0002
  })

  return (
    <group>
      {planets.map((planet) => (
        <group key={planet.id}>
          {/* Main planet with IMAGE texture */}
          <mesh ref={planet.ref} position={planet.position} scale={planet.scale}>
            <sphereGeometry args={[1, 256, 256]} />
            <meshStandardMaterial
              map={loadedTextures[planet.id]}
              roughness={0.6}
              metalness={0.1}
              envMapIntensity={1.2}
            />
          </mesh>

          {/* Glow layer 1 */}
          <mesh position={planet.position} scale={[planet.scale * 1.15, planet.scale * 1.15, planet.scale * 1.15]}>
            <sphereGeometry args={[1, 128, 128]} />
            <meshBasicMaterial
              color={planet.glowColor}
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>

          {/* Glow layer 2 */}
          <mesh position={planet.position} scale={[planet.scale * 1.35, planet.scale * 1.35, planet.scale * 1.35]}>
            <sphereGeometry args={[1, 64, 64]} />
            <meshBasicMaterial
              color={planet.glowColor}
              transparent
              opacity={0.08}
              depthWrite={false}
            />
          </mesh>

          {/* Lighting */}
          <pointLight
            position={planet.position}
            color={planet.glowColor}
            intensity={planet.glowIntensity * 1.5}
            distance={planet.scale * 35}
            decay={2}
          />
        </group>
      ))}
    </group>
  )
}

export default BackgroundPlanets