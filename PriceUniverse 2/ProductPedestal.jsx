import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * ProductPedestal — layered glowing rings beneath a hovered product
 * card (design reference panels 03/04: a circular glow platform the
 * product appears to float above). Hover-only per spec — this only
 * mounts while ProductNode's isHovered is true, so it never adds
 * render cost across the hundreds of idle nodes in a galaxy.
 *
 * Three concentric flat rings, laid flat on the local XZ plane
 * (not tilted to the galaxy disc — this sits directly under an
 * individual card, which is itself always facing the camera via
 * ProductImage's Billboard, so a flat horizontal pedestal reads
 * correctly regardless of where in the galaxy the card sits).
 * Innermost ring pulses opacity/scale continuously; outer two are
 * static glow layers for depth.
 */
const RING_CONFIG = [
  { radius: 0.55, thickness: 0.03, opacity: 0.9, pulses: true },
  { radius: 0.8, thickness: 0.02, opacity: 0.45, pulses: false },
  { radius: 1.05, thickness: 0.015, opacity: 0.22, pulses: false },
]

function ProductPedestal({ position, color }) {
  const pulseRingRef = useRef()
  const pulseMatRef = useRef()

  useFrame((state) => {
    if (!pulseRingRef.current || !pulseMatRef.current) return
    const t = state.clock.elapsedTime
    const pulse = Math.sin(t * 3) * 0.5 + 0.5

    pulseRingRef.current.scale.setScalar(1 + pulse * 0.12)
    pulseMatRef.current.opacity = 0.6 + pulse * 0.3
  })

  return (
    <group position={[position[0], position[1] - 0.65, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      {RING_CONFIG.map((ring, i) => (
        <mesh
          key={i}
          ref={ring.pulses ? pulseRingRef : undefined}
          renderOrder={3}
        >
          <ringGeometry args={[ring.radius - ring.thickness, ring.radius + ring.thickness, 48]} />
          <meshBasicMaterial
            ref={ring.pulses ? pulseMatRef : undefined}
            color={color}
            transparent
            opacity={ring.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* Soft filled glow disc beneath the rings, very dim, gives the
          pedestal a grounded "platform" feel rather than just outline
          circles floating in space. */}
      <mesh position={[0, 0, -0.01]} renderOrder={2}>
        <circleGeometry args={[1.05, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

export default ProductPedestal