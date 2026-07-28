/**
 * NebulaLayer.jsx
 *
 * Renders a single large billboard quad at a given world position
 * using the nebula shader material. Each layer has its own material
 * instance with distinct uniforms so they render independently.
 *
 * The quad is NOT camera-facing (no billboarding) — it's placed in
 * world space at a fixed position and rotation. The camera's natural
 * perspective produces the parallax effect as you orbit the scene.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createNebulaMaterial } from './NebulaMaterial'

export default function NebulaLayer({ config, clockRef }) {
  const meshRef = useRef()

  /* Create material once per layer */
  const material = useMemo(() => createNebulaMaterial({
    color:        config.color,
    opacity:      config.opacity,
    noiseScale:   config.noiseScale,
    warpStrength: config.warpStrength,
    seed:         config.seed,
  }), [config])

  /* Large plane geometry — shared across layers (same size quad) */
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 1, 1), [])

  useFrame(() => {
    if (!material) return
    /* Update time uniform using the shared clock from the parent.
       Multiply by speed to give each layer its own drift rate. */
    material.uniforms.uTime.value = clockRef.current * config.speed * 1000
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={config.position}
      rotation={[0, 0, config.rotation]}
      scale={[config.scale, config.scale, 1]}
      renderOrder={-900}
    />
  )
}
