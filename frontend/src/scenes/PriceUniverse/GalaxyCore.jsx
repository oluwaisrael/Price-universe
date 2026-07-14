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
 */
function GalaxyCore({ center, color }) {
  const position = [center.x, 0, center.z]

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* Soft outer glow shell — larger, dimmer, additive-feeling via
          transparency, gives the core a halo instead of a hard edge. */}
      <mesh>
        <sphereGeometry args={[6, 24, 24]} />
        <meshBasicMaterial
          color={color}
          toneMapped={false}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>

      <pointLight color={color} intensity={4} distance={90} decay={2} />

      <Sparkles
        count={60}
        scale={[50, 6, 50]}
        size={2.5}
        speed={0.15}
        opacity={0.5}
        color={color}
      />
    </group>
  )
}

export default GalaxyCore
