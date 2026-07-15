import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import ProductImage from './ProductImage'
import styles from './ProductNode.module.css'


const NODE_RADIUS = 0.5
const HOVER_SCALE = 1.5
const SELECTED_SCALE = 1.3
const LERP_SPEED = 0.15

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
  const targetEmissive = isSelected ? 0.9 : isHovered ? 0.7 : 0.3

  useFrame(() => {
    if (!meshRef.current) return
    const s = meshRef.current.scale
    const next = s.x + (targetScale - s.x) * LERP_SPEED
    s.set(next, next, next)

    const mat = meshRef.current.material
    mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * LERP_SPEED
  })

  const showCard = isHovered && !isSelected

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
          emissiveIntensity={0.3}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      <ProductImage url={node.image} position={node.position} color={node.color} />

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
