import { Billboard, Html } from '@react-three/drei'
import styles from './GalaxyLabel.module.css'

/**
 * GalaxyLabel — floating name + product-count above each galaxy core.
 * Matches design reference: "JUMIA GALAXY" / "8,742 PRODUCTS" in
 * marketplace tint. Count comes from the live node list.
 */
function GalaxyLabel({ center, site, count, color, galaxyRadius = 20 }) {
  // Sits above MAX_HEIGHT (4.5) so it clears product nodes, scaled
  // slightly with radius so larger discs don't swallow the label.
  const y = Math.max(7.2, galaxyRadius * 0.28)
  const position = [center.x, y, center.z]

  const formattedCount = new Intl.NumberFormat('en-US').format(count ?? 0)

  return (
    <Billboard position={position}>
      <Html center distanceFactor={20} occlude={false} zIndexRange={[50, 0]}>
        <div className={styles.label}>
          <span className={styles.name} style={{ color, textShadow: `0 0 24px ${color}, 0 2px 8px rgba(0,0,0,0.9)` }}>
            {site.toUpperCase()} GALAXY
          </span>
          <span className={styles.count}>{formattedCount} PRODUCTS</span>
        </div>
      </Html>
    </Billboard>
  )
}

export default GalaxyLabel
