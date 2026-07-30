import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Hot overexposed stellar nucleus — white-hot center, colored corona.
 * Not a black hole. Not a dark disc.
 */

function makeHotCoreTexture(colorHex) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const c = new THREE.Color(colorHex)
  const r = Math.round(c.r * 255)
  const g = Math.round(c.g * 255)
  const b = Math.round(c.b * 255)
  const cx = size / 2
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx)
  // Pure white overexposed center
  grad.addColorStop(0.0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.12, 'rgba(255,255,255,0.95)')
  grad.addColorStop(0.28, `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 60)},${Math.min(255, b + 40)},0.7)`)
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.28)`)
  grad.addColorStop(0.75, `rgba(${r},${g},${b},0.06)`)
  grad.addColorStop(1.0, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export default function GalaxyDisc({ center, color, radius }) {
  const group = useRef()
  const tex = useMemo(() => makeHotCoreTexture(color), [color])
  const col = useMemo(() => new THREE.Color(color), [color])

  useFrame(({ clock }) => {
    if (!group.current) return
    const b = 1 + Math.sin(clock.elapsedTime * 0.6) * 0.03
    group.current.scale.setScalar(b)
  })

  // Core stays compact and HOT; outer is soft colored spill only
  const hot = radius * 0.18
  const mid = radius * 0.38
  const spill = radius * 0.65

  return (
    <group ref={group} position={[center.x, 0.5, center.z]}>
      <mesh rotation={[-0.55, 0, 0]} renderOrder={-2}>
        <planeGeometry args={[spill * 2, spill * 2]} />
        <meshBasicMaterial
          map={tex}
          color={col}
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-0.55, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[mid * 2, mid * 2]} />
        <meshBasicMaterial
          map={tex}
          color={col}
          transparent
          opacity={0.65}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {/* White-hot nucleus */}
      <mesh rotation={[-0.55, 0, 0]} renderOrder={0}>
        <planeGeometry args={[hot * 2, hot * 2]} />
        <meshBasicMaterial
          map={tex}
          color="#ffffff"
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
