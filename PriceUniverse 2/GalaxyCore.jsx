import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'

/**
 * GalaxyCore — the bright emissive "center of mass" for one galaxy.
 * Purely decorative (no interaction, no onClick) — sits behind/among
 * the product nodes to sell the spiral-galaxy read. One instance per
 * site, positioned at that site's galaxyLayout center.
 *
 * meshBasicMaterial (not standard) so it's a flat, fully unlit glow
 * that Bloom can push toward blown-out white-hot at the center,
 * matching the reference mockup's bright cores.
 *
 * Gentle pulse: the outer glow shells' opacity and the point light's
 * intensity breathe slowly (sine wave, ~4s period) so the core feels
 * alive rather than static — purely a per-frame ref mutation, no
 * re-renders, no change to geometry/position/interaction.
 */
function GalaxyCore({ center, color }) {
  const position = [center.x, 0, center.z]
  const innerGlowRef = useRef()
  const outerGlowRef = useRef()
  const lightRef = useRef()

  useFrame((state) => {
    const pulse = Math.sin(state.clock.elapsedTime * 0.8) * 0.5 + 0.5 // 0..1

    if (innerGlowRef.current) {
      innerGlowRef.current.opacity = 0.15 + pulse * 0.1
    }
    if (outerGlowRef.current) {
      outerGlowRef.current.opacity = 0.06 + pulse * 0.05
    }
    if (lightRef.current) {
      lightRef.current.intensity = 3.5 + pulse * 1.2
    }
  })

  return (
    <group position={position}>
      {/* White-hot innermost point — Bloom will blow this out toward
          pure white, matching the mockup's brilliant core centers. */}
      <mesh>
        <sphereGeometry args={[0.7, 24, 24]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* Soft outer glow shells — layered, dimmer, additive-feeling via
          transparency, gives the core a wide halo instead of a hard edge.
          Radii cut roughly in half from the previous pass (3.6/6 -> 1.6/2.8):
          at GALAXY_RADIUS=13, a 6-unit glow shell was eating nearly half the
          disc, which is what made the whole galaxy read as one soft blob
          instead of a tight bright core with a spiral around it. */}
      <mesh>
        <sphereGeometry args={[1.6, 24, 24]} />
        <meshBasicMaterial
          ref={innerGlowRef}
          color={color}
          toneMapped={false}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.8, 24, 24]} />
        <meshBasicMaterial
          ref={outerGlowRef}
          color={color}
          toneMapped={false}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      <pointLight ref={lightRef} color={color} intensity={4} distance={30} decay={2} />

      <Sparkles
        count={90}
        scale={[19, 2.5, 19]}
        size={1.8}
        speed={0.15}
        opacity={0.65}
        color={color}
      />
    </group>
  )
}

export default GalaxyCore
