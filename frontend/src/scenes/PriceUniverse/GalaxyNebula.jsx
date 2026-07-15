import { useMemo } from 'react'
import * as THREE from 'three'

function makeGradientTexture(colorHex) {
  const size = 25
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  )

  const color = new THREE.Color(colorHex)
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)

  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.42)`)
  gradient.addColorStop(0.18, `rgba(${r}, ${g}, ${b}, 0.22)`)
  gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.06)`)
  gradient.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, 0.015)`)
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function GalaxyNebula({ center, color, radius = 17 }) {
  const texture = useMemo(() => makeGradientTexture(color), [color])

  return (
    <sprite
      position={[center.x, -0.3, center.z]}
      scale={[radius * 2, radius * 2, 1]}
      renderOrder={-1}
    >
      <spriteMaterial
        map={texture}
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  )
}

export default GalaxyNebula
