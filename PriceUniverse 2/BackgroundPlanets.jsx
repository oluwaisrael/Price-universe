import { Suspense, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
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

  // Directional light offset to one side of the planet, angled so the
  // sphere shows a clear lit hemisphere and a shadowed terminator —
  // this is what actually reads as "a 3D sphere" rather than a flat
  // textured disc. The previous version relied only on a colored
  // pointLight matched to the glow color, which adds ambient-style
  // fill but produces no real shading gradient across the surface.
  //
  // NOTE: a single "offset toward -x/+y/+z" formula happened to land
  // well for Mars/Earth's positions but left Saturn (lower on the y
  // axis, closer to the camera's own height) with its lit side facing
  // away from where the camera actually views it, reading as dim/
  // "faded" even though it wasn't fog — the light was just aimed
  // wrong for that position. Aiming from the camera's general
  // direction instead of a fixed offset keeps every planet's lit
  // hemisphere facing the viewer regardless of where it sits.
  const lightOffset = scale * 6
  const lightPosition = [position[0] - lightOffset * 0.3, position[1] + lightOffset, position[2] + lightOffset * 1.2]

  return (
    <group>
      <mesh ref={rotationRef} position={position} scale={scale}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshStandardMaterial map={texture} roughness={0.75} metalness={0.05} envMapIntensity={0.6} />
      </mesh>

      {/* Thin atmospheric rim, not a soft halo — previous shells (1.15x
          at 0.15 opacity, 1.35x at 0.08 opacity) were large and soft
          enough to read as a blurry glow circle rather than a crisp
          planet edge. Tightened to a single close, subtle shell. */}
      <mesh position={position} scale={[scale * 1.04, scale * 1.04, scale * 1.04]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.18} depthWrite={false} side={THREE.BackSide} />
      </mesh>

      {/* Dedicated directional light for shading, separate from the
          ambient glow-colored fill light below. */}
      <directionalLight position={lightPosition} intensity={1.4} color="#ffffff" />

      {/* Faint colored fill/rim light, kept but dialed down since it's
          now a supplement to real shading rather than the only light
          source. */}
      <pointLight position={position} color={glowColor} intensity={glowIntensity * 0.9} distance={scale * 30} decay={2} />
    </group>
  )
}

function BackgroundPlanets() {
  const mercuryRef = useRef()
  const venusRef = useRef()
  const earthRef = useRef()
  const marsRef = useRef()
  const jupiterRef = useRef()
  const saturnRef = useRef()

  const planets = useMemo(
    () => [
      {
        id: 'mercury',
        ref: mercuryRef,
        rotationSpeed: 0.0001,
        // Bottom-left corner accent. Shifted +12x/-6z to track the
        // camera target's move in the galaxy-radius/spacing pass
        // (target went from x:41,z:-15 to x:53,z:-21) — same relative
        // on-screen position, not re-guessed from scratch.
        position: [-30, -26, -16],
        scale: 10,
        texturePath: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/moonmap1k.jpg',
        glowColor: '#999999',
        glowIntensity: 0.4,
      },
      {
        id: 'venus',
        ref: venusRef,
        rotationSpeed: -0.00008,
        // Repositioned from the old far-back spot (z:-136, y:60) which
        // sat outside the default idle framing and only entered view
        // during the closer fly-to-product zoom. Moved into the same
        // proven-visible z/y range as Mars/Earth/moon/Saturn — upper
        // empty area between the two galaxies.
        position: [90, 42, -30],
        scale: 9,
        texturePath: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/venusmap.jpg',
        glowColor: '#fbbf24',
        glowIntensity: 0.6,
      },
      {
        id: 'earth',
        ref: earthRef,
        rotationSpeed: 0.00012,
        // Right edge accent. Pulled in from x:150 (which was clipping
        // almost entirely off-frame) and enlarged so it reads clearly
        // as a planet rather than a sliver.
        position: [128, 22, -60],
        scale: 12,
        texturePath: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/earthmap1k.jpg',
        glowColor: '#0ea5e9',
        glowIntensity: 0.65,
      },
      {
        id: 'mars',
        ref: marsRef,
        rotationSpeed: 0.00014,
        position: [72, -40, -101],
        scale: 11,
        texturePath: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/marsmap1k.jpg',
        glowColor: '#f87171',
        glowIntensity: 0.5,
      },
      {
        id: 'jupiter',
        ref: jupiterRef,
        rotationSpeed: 0.0002,
        // Repositioned from the old far-back spot (z:-131) which sat
        // outside default framing, same reasoning as Venus above.
        // Placed in the empty middle-background gap between the two
        // galaxies, distant enough (z:-90) to read as background scale
        // despite the large radius.
        // Moved right and back from the previous (10,-10,-90), which
        // sat directly behind the hero text and dominated the left
        // side of the frame. Now positioned as a background accent
        // nearer the galaxies instead of overlapping the text panel.
        position: [55, -12, -95],
        scale: 16,
        texturePath: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/jupitermap.jpg',
        glowColor: '#fb923c',
        glowIntensity: 0.7,
      },
      {
        id: 'saturn',
        ref: saturnRef,
        rotationSpeed: 0.00009,
        // New accent in the previously empty lower area below the
        // text panel — same near-camera distance/scale range that
        // proved to work for Mars and the moon (z around -20 to -101,
        // scale 10-12), rather than guessing at Venus/Jupiter's far
        // (z:-130+) positions which haven't been confirmed visible.
        position: [-8, -48, 10],
        scale: 10,
        texturePath: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/saturnmap.jpg',
        glowColor: '#e8c88a',
        glowIntensity: 0.55,
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
