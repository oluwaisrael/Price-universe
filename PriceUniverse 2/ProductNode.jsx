import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import ProductImage from './ProductImage'
import ProductPedestal from './ProductPedestal'
import styles from './ProductNode.module.css'

/**
 * ProductNode — interaction sphere + billboard + hover card.
 *
 * Hover card (panel 03 in the design reference) shows name, site
 * (colored by marketplace, matching the node/galaxy tint), and
 * price. Lowest/highest price and price-drop frequency from the
 * mockup are NOT included — normalizeProducts() doesn't expose that
 * data yet (no history aggregation on the backend). Revisit once
 * that's available rather than fabricating placeholder numbers here.
 *
 * priceScale (0..1, log-scaled like the existing height calculation
 * in galaxyLayout.js) approximates "how expensive is this relative to
 * its own marketplace's range" using node.priceRank if the caller
 * supplied one, falling back to a neutral 0.5 — this keeps
 * ProductNode standalone-renderable without requiring every caller to
 * pass min/max price context it may not have.
 */
const NODE_RADIUS = 0.5
const HOVER_SCALE = 1.4
const SELECTED_SCALE = 1.25
const LERP_SPEED = 0.15

// The interaction sphere sits directly behind the ProductImage
// billboard. Its idle emissive was previously 0.3 — bright enough,
// combined with the (now-fixed) oversized ProductImage glow, to read
// as a second layer of "colored blob" behind every card even at rest.
// Dropped further at idle so the sphere reads as a faint anchor point
// rather than contributing its own glow; it still brightens on hover/
// selection same as before, via targetEmissive below.
const IDLE_EMISSIVE = 0.12
const HOVER_EMISSIVE = 0.7
const SELECTED_EMISSIVE = 0.9

function formatPrice(price) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)
}

function ProductNode({ node, isSelected, onSelect }) {
  const meshRef = useRef()
  const [isHovered, setIsHovered] = useState(false)

  const targetScale = isSelected ? SELECTED_SCALE : isHovered ? HOVER_SCALE : 1
  const targetEmissive = isSelected ? SELECTED_EMISSIVE : isHovered ? HOVER_EMISSIVE : IDLE_EMISSIVE

  // Gentle idle float: a small per-node sine offset added on top of
  // the node's fixed layout position, so nodes feel alive rather than
  // frozen in place. Phase is derived from node.id so nodes don't all
  // bob in lockstep. Purely visual — node.position itself (used by
  // DetailPanel, CameraRig fly-to, and the underlying click target
  // math) is untouched; only the rendered mesh position gets the
  // offset, applied each frame directly on the ref.
  const floatSeed = useRef(
    Array.from(String(node.id)).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 1000
  )

  useFrame((state) => {
    if (!meshRef.current) return
    const s = meshRef.current.scale
    const next = s.x + (targetScale - s.x) * LERP_SPEED
    s.set(next, next, next)

    const mat = meshRef.current.material
    mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * LERP_SPEED

    const t = state.clock.elapsedTime + floatSeed.current
    const floatOffset = Math.sin(t * 0.6) * 0.08
    meshRef.current.position.y = node.position[1] + floatOffset
  })

  const showCard = isHovered && !isSelected

  // priceScale: caller (PriceUniverse) attaches node.priceScale as a
  // 0..1 value derived the same way priceToHeight already derives
  // height in galaxyLayout.js, so "higher price = bigger card" uses
  // the identical log-normalized ranking as "higher price = higher in
  // space" rather than inventing a second scale.
  const priceScale = typeof node.priceScale === 'number' ? node.priceScale : 0.5

  return (
    <group>
      <mesh
        ref={meshRef}
        position={node.position}
        onPointerOver={(e) => {
          e.stopPropagation()
          setIsHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setIsHovered(false)
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.(node)
        }}
      >
        <sphereGeometry args={[NODE_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={IDLE_EMISSIVE}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      <ProductImage
        url={node.image}
        position={node.position}
        color={node.color}
        name={node.name}
        priceScale={priceScale}
        isHovered={isHovered}
        seed={String(node.id)}
      />

      {isHovered && (
        <ProductPedestal position={node.position} color={node.color} />
      )}

      {showCard && (
        <Html
          position={[
            node.position[0] + NODE_RADIUS + 0.6,
            node.position[1],
            node.position[2],
          ]}
          center={false}
          distanceFactor={12}
          occlude={false}
        >
          <div className={styles.hoverCard}>
            <span className={styles.hoverName}>{node.name}</span>
            <span className={styles.hoverSite} style={{ color: node.color }}>
              {node.site}
            </span>
            <span className={styles.hoverPrice}>{formatPrice(node.price)}</span>
          </div>
        </Html>
      )}
    </group>
  )
}

export default ProductNode
