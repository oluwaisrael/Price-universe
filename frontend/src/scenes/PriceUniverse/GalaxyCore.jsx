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
  const transitionGlowRef = useRef()
  const lightRef = useRef()

  useFrame((state) => {
    const pulse = Math.sin(state.clock.elapsedTime * 0.8) * 0.5 + 0.5 // 0..1

    if (innerGlowRef.current) {
      innerGlowRef.current.opacity = 0.24 + pulse * 0.14
    }
    if (outerGlowRef.current) {
      outerGlowRef.current.opacity = 0.1 + pulse * 0.06
    }
    if (transitionGlowRef.current) {
      transitionGlowRef.current.opacity = 0.05 + pulse * 0.03
    }
    if (lightRef.current) {
      // Increased base + pulse range, and distance/decay below widened
      // so the core's light actually reaches and lifts the brightness
      // of nearby arm-dust points instead of only affecting geometry
      // right at the core.
      lightRef.current.intensity = 5.5 + pulse * 1.8
    }
  })

  return (
    <group position={position}>
      {/* White-hot innermost point — Bloom will blow this out toward
          pure white, matching the mockup's brilliant core centers. */}
      <mesh>
        <sphereGeometry args={[0.85, 24, 24]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.1, 32, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* Soft outer glow shells — layered, dimmer, additive-feeling via
          transparency, gives the core a wide halo instead of a hard edge. */}
      <mesh>
        <sphereGeometry args={[1.9, 24, 24]} />
        <meshBasicMaterial
          ref={innerGlowRef}
          color={color}
          toneMapped={false}
          transparent
          opacity={0.24}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[3.4, 24, 24]} />
        <meshBasicMaterial
          ref={outerGlowRef}
          color={color}
          toneMapped={false}
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>

      {/* New wide transitional glow shell — much larger, very faint,
          reaching out toward where the core-dust collar begins. This
          is what softens the core-to-arm handoff so the bright center
          fades gradually into the surrounding dust instead of
          stopping abruptly at the outer glow shell's edge. */}
      <mesh>
        <sphereGeometry args={[6.5, 20, 20]} />
        <meshBasicMaterial
          ref={transitionGlowRef}
          color={color}
          toneMapped={false}
          transparent
          opacity={0.05}
          depthWrite={false}
        />
      </mesh>

      {/* Point light range/intensity increased so the core visibly
          illuminates the additive dust particles immediately
          surrounding it, not just contributing to bloom in isolation. */}
      <pointLight ref={lightRef} color={color} intensity={5.5} distance={42} decay={1.8} />

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
