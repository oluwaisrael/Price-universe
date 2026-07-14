import { Suspense } from 'react'
import { Billboard, useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import ImageErrorBoundary from './ImageErrorBoundary'

const NODE_RADIUS = 0.35
const BILLBOARD_MAX_DIM = 4
const FORWARD_OFFSET = NODE_RADIUS + 1.5

const NARROW_ASPECT_BREAKPOINT = 0.7
const MIN_SCALE = 0.45

function getResponsiveMaxDim(aspect) {
  if (aspect >= NARROW_ASPECT_BREAKPOINT) return BILLBOARD_MAX_DIM
  const t = Math.max(aspect / NARROW_ASPECT_BREAKPOINT, 0)
  const scale = MIN_SCALE + (1 - MIN_SCALE) * t
  return BILLBOARD_MAX_DIM * scale
}

function Texture({ url }) {
  const texture = useTexture(url)
  const { size } = useThree()
  const aspectRatio = size.width / size.height

  const { width, height } = texture.image
  const imageAspect = width / height
  const maxDim = getResponsiveMaxDim(aspectRatio)

  const planeWidth = imageAspect >= 1 ? maxDim : maxDim * imageAspect
  const planeHeight = imageAspect >= 1 ? maxDim / imageAspect : maxDim

  return (
    <mesh renderOrder={1}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  )
}

function ProductImage({ url, position }) {
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
          <Texture url={url} />
        </Suspense>
      </ImageErrorBoundary>
    </Billboard>
  )
}

export default ProductImage
