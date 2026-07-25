import { Suspense, useMemo, useRef } from 'react'
import { Billboard, Html, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import ImageErrorBoundary from './ImageErrorBoundary'

const NODE_RADIUS = 0.5
const BILLBOARD_MAX_DIM = 1.1
const FORWARD_OFFSET = NODE_RADIUS + 0.4

const NARROW_ASPECT_BREAKPOINT = 0.7
const MIN_SCALE = 0.45

// Price-driven sizing: higher-priced products render as a visibly
// larger card, within a modest range so cheap items never disappear
// and expensive ones never dominate the scene. priceScale is a plain
// 0..1 already computed by ProductNode from the node's price relative
// to that galaxy's min/max — this file just maps it onto a visual
// multiplier.
const MIN_PRICE_SCALE = 0.78
const MAX_PRICE_SCALE = 1.3

// Small deterministic per-node jitter — a slight in-plane rotation and
// a small extra forward/lateral offset — so cards at similar spiral
// radii don't sit at visually identical depth/orientation and blur
// together into one mass when several are close. Hashed from a seed
// string (not Math.random) so layout stays stable across re-renders,
// matching the determinism convention already used in galaxyLayout.js.
const ROTATION_JITTER_RAD = 0.18
const OFFSET_JITTER = 0.35

function hashToUnit(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}

function getResponsiveMaxDim(aspect) {
  if (aspect >= NARROW_ASPECT_BREAKPOINT) return BILLBOARD_MAX_DIM
  const t = Math.max(aspect / NARROW_ASPECT_BREAKPOINT, 0)
  const scale = MIN_SCALE + (1 - MIN_SCALE) * t
  return BILLBOARD_MAX_DIM * scale
}

// Frame padding + glow sizing, relative to the image plane's own
// dimensions. Previous pass (0.32 / 0.85) made the glow almost 3x the
// image's own footprint at high opacity — that oversized, bright halo
// is what was reading as "glowing squares" rather than product photos,
// and why adjacent nodes' glows overlapped into a single mass. Both
// cut down hard: the frame is now a thin accent line (not a filled
// block competing with the photo), and the idle glow is small and
// dim, existing as a subtle rim rather than the dominant visual
// element. Hover glow (see CardFrame below) is a separate, much
// stronger pulse layered on top only for the hovered node, so
// "hover intensifies only that node" actually reads as a real change
// instead of being lost in an already-bright baseline.
const FRAME_PADDING = 0.06
const GLOW_PADDING = 0.14
const IDLE_GLOW_OPACITY = 0.16
const HOVER_GLOW_OPACITY = 0.6

/**
 * CardFrame — the glow + border + backing chrome shared by both the
 * real product image and the fallback initial-letter card, so hover
 * pulse and price-scale behave identically whether or not the image
 * loaded. `children` renders the innermost content plane.
 */
function CardFrame({ frameColor, planeWidth, planeHeight, isHovered, children }) {
  const glowRef = useRef()

  const frameWidth = planeWidth + FRAME_PADDING * 2
  const frameHeight = planeHeight + FRAME_PADDING * 2
  const glowWidth = planeWidth + GLOW_PADDING * 2
  const glowHeight = planeHeight + GLOW_PADDING * 2

  // At rest, the glow sits at a low, steady IDLE_GLOW_OPACITY — quiet
  // enough that it reads as a subtle accent rather than the dominant
  // shape. Only on hover does it pulse up toward HOVER_GLOW_OPACITY,
  // and only for the specific node being hovered (isHovered is this
  // node's own state from ProductNode, not shared), so intensifying
  // one node's glow no longer washes out its neighbors or reads as
  // "everything glows the same amount all the time."
  useFrame((state) => {
    if (!glowRef.current) return
    if (isHovered) {
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.5 + 0.5
      glowRef.current.scale.setScalar(1 + pulse * 0.15)
      if (glowRef.current.material) {
        glowRef.current.material.opacity = HOVER_GLOW_OPACITY - pulse * 0.15
      }
    } else {
      glowRef.current.scale.setScalar(
        glowRef.current.scale.x + (1 - glowRef.current.scale.x) * 0.15
      )
      if (glowRef.current.material) {
        const mat = glowRef.current.material
        mat.opacity += (IDLE_GLOW_OPACITY - mat.opacity) * 0.15
      }
    }
  })

  return (
    <group>
      {/* Soft outer glow — small and dim at rest (see IDLE_GLOW_OPACITY
          above); this is now a subtle accent, not the dominant shape.
          Pulses brighter only while this specific node is hovered. */}
      <mesh ref={glowRef} renderOrder={-1} position={[0, 0, -0.02]}>
        <planeGeometry args={[glowWidth, glowHeight]} />
        <meshBasicMaterial
          color={frameColor}
          transparent
          opacity={IDLE_GLOW_OPACITY}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Card frame — thin marketplace-colored accent line just
          outside the image edge, not a filled block. Previously this
          was a large opaque plane (FRAME_PADDING 0.32) that competed
          with the photo for visual weight; now it's a slim ~0.06-unit
          border, closer to a real product card's edge highlight. */}
      <mesh renderOrder={0} position={[0, 0, -0.01]}>
        <planeGeometry args={[frameWidth, frameHeight]} />
        <meshBasicMaterial
          color={frameColor}
          transparent
          opacity={0.85}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Dark backing, trimmed to just barely peek past the image
          edge (enough to show the frame accent as a visible line)
          rather than a wide dark margin. */}
      <mesh renderOrder={0} position={[0, 0, -0.005]}>
        <planeGeometry args={[planeWidth + FRAME_PADDING * 0.9, planeHeight + FRAME_PADDING * 0.9]} />
        <meshBasicMaterial color="#05050c" toneMapped={false} depthWrite={false} />
      </mesh>

      {children}
    </group>
  )
}

function Texture({ url, frameColor, planeWidth, planeHeight, isHovered }) {
  const texture = useTexture(url)

  return (
    <CardFrame
      frameColor={frameColor}
      planeWidth={planeWidth}
      planeHeight={planeHeight}
      isHovered={isHovered}
    >
      <mesh renderOrder={1}>
        <planeGeometry args={[planeWidth, planeHeight]} />
        <meshBasicMaterial
          map={texture}
          transparent
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </CardFrame>
  )
}

/**
 * FallbackCard — shown when a product has no image URL, or when the
 * image fails to load (404 / CORS / proxy timeout — this was
 * previously silently rendering nothing, which is why some Jumia
 * products with broken proxied URLs showed no card at all while their
 * sibling Jiji products, whose images happened to load, looked fine).
 * Renders the same CardFrame chrome (glow/border/backing/hover-pulse)
 * so a broken-image product still reads as a real card in the galaxy,
 * with the product's first initial and marketplace color standing in
 * for the missing thumbnail.
 */
function FallbackCard({ frameColor, planeWidth, planeHeight, isHovered, initial }) {
  return (
    <CardFrame
      frameColor={frameColor}
      planeWidth={planeWidth}
      planeHeight={planeHeight}
      isHovered={isHovered}
    >
      <mesh renderOrder={1}>
        <planeGeometry args={[planeWidth, planeHeight]} />
        <meshBasicMaterial color={frameColor} transparent opacity={0.35} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* No canvas-texture dependency for the letter — a simple HTML
          overlay (same pattern GalaxyLabel/ProductNode's hover card
          already use via drei's Html) centered on the card, styled
          inline so this file stays self-contained. distanceFactor
          keeps it screen-space-consistent with everything else that
          uses Html in this scene.

          NOTE: distanceFactor scaling is relative to camera distance,
          so a fixed px font-size here can render enormous for any
          node that ends up close to the camera (this is what was
          previously mistaken for a stray "search icon"/giant glyph
          artifact in the hero — with the current product data having
          no working images, every card in a galaxy falls back to
          this letter, so the bug was highly visible). Sized down and
          clamped so it can never exceed a small, card-appropriate
          footprint regardless of distance. */}
      <Html center distanceFactor={10} occlude={false} renderOrder={2}>
        <div
          style={{
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(8px, 1vw, 13px)',
            lineHeight: 1,
            color: frameColor,
            textShadow: `0 0 6px ${frameColor}`,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {initial}
        </div>
      </Html>
    </CardFrame>
  )
}

function ProductImage({ url, position, color = '#ffffff', name = '', priceScale = 0.5, isHovered = false, seed = '' }) {
  const jitterSeed = seed || url || name || '0,0,0'.concat(position.join(','))

  // Deterministic per-node variance: a small in-plane rotation (so
  // cards don't all sit perfectly upright/aligned, breaking up the
  // "grid of identical squares" read) and a small extra forward/
  // lateral offset (so nodes placed close together in the spiral
  // don't sit at the exact same depth and visually fuse). Both are
  // tiny relative to card size — this is meant to read as natural
  // variation, not chaos.
  const rotationZ = useMemo(
    () => (hashToUnit(`${jitterSeed}-rot`) - 0.5) * 2 * ROTATION_JITTER_RAD,
    [jitterSeed]
  )
  const extraOffset = useMemo(() => {
    const ox = (hashToUnit(`${jitterSeed}-ox`) - 0.5) * 2 * OFFSET_JITTER
    const oy = (hashToUnit(`${jitterSeed}-oy`) - 0.5) * 2 * OFFSET_JITTER * 0.6
    const oz = hashToUnit(`${jitterSeed}-oz`) * OFFSET_JITTER * 0.8
    return [ox, oy, oz]
  }, [jitterSeed])

  const billboardPosition = [
    position[0] + extraOffset[0],
    position[1] + extraOffset[1],
    position[2] + FORWARD_OFFSET + extraOffset[2],
  ]

  const { size } = useThree()
  const aspectRatio = size.width / size.height
  const maxDim = getResponsiveMaxDim(aspectRatio)

  // Map priceScale (0..1) onto a visual multiplier, then apply to the
  // default 1:1 (square-ish) fallback plane. Real images set their own
  // aspect-correct plane dims inside Texture and get this same
  // multiplier applied via the group scale below, so both the real
  // image and fallback card size consistently with price.
  const sizeMultiplier = useMemo(
    () => MIN_PRICE_SCALE + priceScale * (MAX_PRICE_SCALE - MIN_PRICE_SCALE),
    [priceScale]
  )

  const initial = (name?.trim?.()[0] ?? '?').toUpperCase()

  return (
    <Billboard position={billboardPosition}>
      <group scale={sizeMultiplier} rotation={[0, 0, rotationZ]}>
        {url ? (
          <ImageErrorBoundary
            fallback={
              <FallbackCard
                frameColor={color}
                planeWidth={maxDim}
                planeHeight={maxDim}
                isHovered={isHovered}
                initial={initial}
              />
            }
          >
            <Suspense
              fallback={
                <FallbackCard
                  frameColor={color}
                  planeWidth={maxDim}
                  planeHeight={maxDim}
                  isHovered={isHovered}
                  initial={initial}
                />
              }
            >
              <Texture
                url={url}
                frameColor={color}
                planeWidth={maxDim}
                planeHeight={maxDim}
                isHovered={isHovered}
              />
            </Suspense>
          </ImageErrorBoundary>
        ) : (
          <FallbackCard
            frameColor={color}
            planeWidth={maxDim}
            planeHeight={maxDim}
            isHovered={isHovered}
            initial={initial}
          />
        )}
      </group>
    </Billboard>
  )
}

export default ProductImage
