/**
 * DeepSpaceBackground3D.jsx
 *
 * Drop this inside your existing <Canvas> in PriceUniverse.jsx,
 * before any other scene objects so it renders furthest back.
 *
 * Usage:
 *   import DeepSpaceBackground3D from './DeepSpaceBackground3D/DeepSpaceBackground3D'
 *
 *   // Inside <Canvas>:
 *   <DeepSpaceBackground3D />
 *   <BackgroundPlanets />
 *   ... rest of scene
 *
 * Remove:
 *   - <Stars> from drei (replaced)
 *   - <color attach="background" args={['#020208']} /> (keep or set to #000000)
 *   - The old DeepSpaceBackground canvas component from your HTML wrapper
 */

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import NebulaLayer from './NebulaLayer'
import Starfield from './Starfield'
import DustLayer from './DustLayer'

// Each nebula definition: position, scale, color, rotation, speed, opacity
// Colors are intentionally desaturated — this is not a neon space scene
const NEBULA_CONFIGS = [
  {
    id: 'n0',
    position: [-180, 40, -600],
    scale: 420,
    color: new THREE.Color(0.10, 0.06, 0.28),   // deep indigo
    rotation: 0.31,
    speed: 0.00018,
    opacity: 0.82,
    noiseScale: 1.8,
    warpStrength: 1.4,
    seed: 0.0,
  },
  {
    id: 'n1',
    position: [260, -60, -750],
    scale: 500,
    color: new THREE.Color(0.22, 0.05, 0.18),   // dark magenta
    rotation: -0.55,
    speed: 0.00012,
    opacity: 0.65,
    noiseScale: 2.2,
    warpStrength: 1.8,
    seed: 17.3,
  },
  {
    id: 'n2',
    position: [80, 120, -500],
    scale: 360,
    color: new THREE.Color(0.04, 0.18, 0.22),   // muted teal
    rotation: 1.1,
    speed: 0.00022,
    opacity: 0.55,
    noiseScale: 1.5,
    warpStrength: 2.1,
    seed: 34.7,
  },
  {
    id: 'n3',
    position: [-300, -80, -680],
    scale: 440,
    color: new THREE.Color(0.18, 0.04, 0.30),   // violet
    rotation: 0.72,
    speed: 0.00015,
    opacity: 0.48,
    noiseScale: 2.8,
    warpStrength: 1.2,
    seed: 52.1,
  },
  {
    id: 'n4',
    position: [350, 180, -820],
    scale: 550,
    color: new THREE.Color(0.06, 0.14, 0.20),   // desaturated blue-cyan
    rotation: -0.28,
    speed: 0.00010,
    opacity: 0.40,
    noiseScale: 1.2,
    warpStrength: 2.6,
    seed: 71.9,
  },
  {
    id: 'n5',
    position: [-100, -200, -900],
    scale: 600,
    color: new THREE.Color(0.14, 0.08, 0.06),   // faint amber-rust
    rotation: 1.85,
    speed: 0.00008,
    opacity: 0.35,
    noiseScale: 0.9,
    warpStrength: 3.0,
    seed: 88.4,
  },
  {
    id: 'n6',
    position: [500, -120, -1000],
    scale: 480,
    color: new THREE.Color(0.08, 0.20, 0.18),   // deep cyan-green
    rotation: -1.2,
    speed: 0.00014,
    opacity: 0.30,
    noiseScale: 2.0,
    warpStrength: 1.6,
    seed: 103.6,
  },
  {
    id: 'n7',
    position: [-400, 200, -1100],
    scale: 700,
    color: new THREE.Color(0.12, 0.04, 0.20),   // ultraviolet
    rotation: 0.44,
    speed: 0.00006,
    opacity: 0.25,
    noiseScale: 1.4,
    warpStrength: 2.4,
    seed: 119.2,
  },
]

const DUST_CONFIGS = [
  {
    id: 'd0',
    position: [-50, 30, -420],
    scale: 340,
    rotation: 0.6,
    speed: 0.00028,
    opacity: 0.55,
    seed: 200.0,
  },
  {
    id: 'd1',
    position: [180, -50, -560],
    scale: 280,
    rotation: -0.9,
    speed: 0.00020,
    opacity: 0.40,
    seed: 220.5,
  },
  {
    id: 'd2',
    position: [-220, 100, -480],
    scale: 380,
    rotation: 1.4,
    speed: 0.00016,
    opacity: 0.35,
    seed: 241.7,
  },
]

export default function DeepSpaceBackground3D() {
  const groupRef = useRef()
  const clockRef = useRef(0)

  useFrame((_, delta) => {
    clockRef.current += delta
  })

  return (
    <group ref={groupRef} renderOrder={-1000}>
      {/* Deepest nebulae — furthest back */}
      {NEBULA_CONFIGS.map((cfg) => (
        <NebulaLayer key={cfg.id} config={cfg} clockRef={clockRef} />
      ))}

      {/* Molecular dust lanes — in front of nebulae, behind stars */}
      {DUST_CONFIGS.map((cfg) => (
        <DustLayer key={cfg.id} config={cfg} clockRef={clockRef} />
      ))}

      {/* Instanced starfield — three depth layers */}
      <Starfield clockRef={clockRef} />
    </group>
  )
}
