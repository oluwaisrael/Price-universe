/**
 * DustLayer.jsx
 *
 * Renders a single molecular dust lane as a large world-space quad
 * using the dust shader (dust.vert / dust.frag).
 *
 * Dust uses CustomBlending to darken what's behind it — simulating
 * the way interstellar dust absorbs background light.
 *
 * Each dust layer is positioned between the nebula layers and the
 * starfield so it correctly occludes nebula glow but not foreground stars.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createDustMaterial } from './NebulaMaterial'

export default function DustLayer({ config, clockRef }) {
  const meshRef = useRef()

  const material = useMemo(() => createDustMaterial({
    opacity: config.opacity,
    seed:    config.seed,
  }), [config])

  /* Elongated plane — dust lanes are long and thin */
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 1, 1), [])

  useFrame(() => {
    if (!material) return
    material.uniforms.uTime.value = clockRef.current
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={config.position}
      rotation={[0, 0, config.rotation]}
      /* Wide and elongated — the shader's lane UV does the rest */
      scale={[config.scale * 2.2, config.scale * 0.7, 1]}
      renderOrder={-850}
    />
  )
}
