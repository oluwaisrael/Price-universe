import { Suspense } from 'react'
import { Billboard, useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import ImageErrorBoundary from './ImageErrorBoundary'

const NODE_RADIUS = 0.5
const BILLBOARD_MAX_DIM = 1.1
const FORWARD_OFFSET = NODE_RADIUS + 0.4

const NARROW_ASPECT_BREAKPOINT = 0.7
const MIN_SCALE = 0.45

function getResponsiveMaxDim(aspect) {
  if (aspect >= NARROW_ASPECT_BREAKPOINT) return BILLBOARD_MAX_DIM
  const t = Math.max(aspect / NARROW_ASPECT_BREAKPOINT, 0)
  const scale = MIN_SCALE + (1 - MIN_SCALE) * t
  return BILLBOARD_MAX_DIM * scale
}


const FRAME_PADDING = 0.16
const GLOW_PADDING = 0.5

function Texture({ url, frameColor }) {
  const texture = useTexture(url)
  const { size } = useThree()
  const aspectRatio = size.width / size.height

  const { width, height } = texture.image
  const imageAspect = width / height
  const maxDim = getResponsiveMaxDim(aspectRatio)

  const planeWidth = imageAspect >= 1 ? maxDim : maxDim * imageAspect
  const planeHeight = imageAspect >= 1 ? maxDim / imageAspect : maxDim

  const frameWidth = planeWidth + FRAME_PADDING * 2
  const frameHeight = planeHeight + FRAME_PADDING * 2
  const glowWidth = planeWidth + GLOW_PADDING * 2
  const glowHeight = planeHeight + GLOW_PADDING * 2

  return (
    <group>
      <mesh renderOrder={-1} position={[0, 0, -0.02]}>
        <planeGeometry args={[glowWidth, glowHeight]} />
        <meshBasicMaterial
          color={frameColor}
          transparent
          opacity={0.35}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      <mesh renderOrder={0} position={[0, 0, -0.01]}>
        <planeGeometry args={[frameWidth, frameHeight]} />
        <meshBasicMaterial
          color={frameColor}
          transparent
          opacity={0.9}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      
      <mesh renderOrder={0} position={[0, 0, -0.005]}>
        <planeGeometry args={[planeWidth + FRAME_PADDING * 0.6, planeHeight + FRAME_PADDING * 0.6]} />
        <meshBasicMaterial color="#05050c" toneMapped={false} depthWrite={false} />
      </mesh>

      <mesh renderOrder={1}>
        <planeGeometry args={[planeWidth, planeHeight]} />
        <meshBasicMaterial
          map={texture}
          transparent
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function ProductImage({ url, position, color = '#ffffff' }) {
  if (!url) return null

  const billboardPosition = [
    position[0],
    position[1],
    position[2] + FORWARD_OFFSET,
  ]

  return (
    <Billboard position={billboardPosition}>
      <ImageErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <Texture url={url} frameColor={color} />
        </Suspense>
      </ImageErrorBoundary>
    </Billboard>
  )
}

export default ProductImage
