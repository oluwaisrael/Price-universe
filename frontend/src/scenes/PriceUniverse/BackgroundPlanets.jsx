import { Suspense, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import ImageErrorBoundary from './ImageErrorBoundary'

/**
 * BackgroundPlanets — real textured planets, loaded via drei's
 * useTexture (Suspense-based) instead of the previous raw
 * TextureLoader().load(url, callback) pattern, which mutated a plain
 * object inside the callback that React never observed — meshes kept
 * referencing an `undefined` map forever, regardless of whether the
 * fetch actually succeeded. Each planet gets its own Suspense boundary
 * so one slow/failed texture doesn't block the others from appearing.
 *
 * Texture URLs point at three.js's public example asset CDN as a
 * working placeholder — for production, download these and serve them
 * from this project's own /public/textures/ so the scene doesn't
 * depend on an external site staying up.
 */
function Planet({ rotationRef, rotationSpeed, position, scale, texturePath, glowColor, glowIntensity }) {
  const texture = useTexture(texturePath)

  useFrame(() => {
    if (rotationRef.current) rotationRef.current.rotation.y += rotationSpeed
  })

  return (
    <group>
      <mesh ref={rotationRef} position={position} scale={scale}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshStandardMaterial map={texture} roughness={0.6} metalness={0.1} envMapIntensity={1.2} />
      </mesh>

      <mesh position={position} scale={[scale * 1.15, scale * 1.15, scale * 1.15]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.15} depthWrite={false} />
      </mesh>

      <mesh position={position} scale={[scale * 1.35, scale * 1.35, scale * 1.35]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.08} depthWrite={false} />
      </mesh>

      <pointLight position={position} color={glowColor} intensity={glowIntensity * 1.5} distance={scale * 35} decay={2} />
    </group>
  )
}

function BackgroundPlanets() {
  const mercuryRef = useRef()
  const venusRef = useRef()
  const earthRef = useRef()
  const marsRef = useRef()
  const jupiterRef = useRef()

  const planets = useMemo(
    () => [
      {
        id: 'mercury',
        ref: mercuryRef,
        rotationSpeed: 0.0001,
        // Bottom-left corner accent, pulled back further than before —
        // scale 14 at this distance was the same over-large mistake as
        // the original Earth placement.
        position: [-42, -26, -10],
        scale: 7,
        texturePath: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/moonmap1k.jpg',
        glowColor: '#999999',
        glowIntensity: 0.4,
      },
      {
        id: 'venus',
        ref: venusRef,
        rotationSpeed: -0.00008,
        position: [-80, 60, -130],
        scale: 9,
        texturePath: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/venusmap.jpg',
        glowColor: '#fbbf24',
        glowIntensity: 0.6,
      },
      {
        id: 'earth',
        ref: earthRef,
        rotationSpeed: 0.00012,
        // Right edge, pushed back and smaller — previous pass (scale
        // 16, z=20) put it too close/large and it swallowed the right
        // side of the frame. This should read as a distant accent
        // peeking in from the edge, not a dominant foreground sphere.
        position: [138, 24, -60],
        scale: 8,
        texturePath: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/earthmap1k.jpg',
        glowColor: '#0ea5e9',
        glowIntensity: 0.65,
      },
      {
        id: 'mars',
        ref: marsRef,
        rotationSpeed: 0.00014,
        position: [60, -40, -95],
        scale: 7,
        texturePath: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/marsmap1k.jpg',
        glowColor: '#f87171',
        glowIntensity: 0.5,
      },
      {
        id: 'jupiter',
        ref: jupiterRef,
        rotationSpeed: 0.0002,
        position: [-90, -55, -125],
        scale: 20,
        texturePath: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/jupitermap.jpg',
        glowColor: '#fb923c',
        glowIntensity: 0.7,
      },
    ],
    []
  )

  return (
    <group>
      {planets.map((planet) => (
        <ImageErrorBoundary key={planet.id} fallback={null}>
          <Suspense fallback={null}>
            <Planet
              rotationRef={planet.ref}
              rotationSpeed={planet.rotationSpeed}
              position={planet.position}
              scale={planet.scale}
              texturePath={planet.texturePath}
              glowColor={planet.glowColor}
              glowIntensity={planet.glowIntensity}
            />
          </Suspense>
        </ImageErrorBoundary>
      ))}
    </group>
  )
}

export default BackgroundPlanets
