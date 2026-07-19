import { Billboard, Html } from '@react-three/drei'
import styles from './GalaxyLabel.module.css'

/**
 * GalaxyLabel — floating name + product-count label above each
 * galaxy core (design reference panel 01: "JUMIA GALAXY — 48
 * products", colored to match that galaxy's tint). Purely
 * decorative/informational, no interaction.
 *
 * count comes from the real fetched node list (filtered by site) via
 * the caller — not hardcoded, so it stays accurate as products are
 * added/removed server-side.
 */
function GalaxyLabel({ center, site, count, color, galaxyRadius = 20 }) {
  // Height now scales with galaxyRadius (was a flat 5.5, tuned back
  // when GALAXY_RADIUS was 13) — at the larger radius from the
  // composition pass, a fixed height no longer cleared the top of the
  // tilted disc, so the label sat inside the star clutter instead of
  // floating clearly above it like the reference's section-header feel.
  // Sits above MAX_HEIGHT (4.5, galaxyLayout.js's price-height ceiling)
  // so it clears the highest product nodes, without floating so high
  // it looks disconnected from the galaxy below it.
  const position = [center.x, 6.5, center.z]

  return (
    <Billboard position={position}>
      <Html center distanceFactor={22} occlude={false}>
        <div className={styles.label}>
          <span className={styles.name} style={{ color }}>
            {site.toUpperCase()} GALAXY
          </span>
          <span className={styles.count}>{count} products</span>
        </div>
      </Html>
    </Billboard>
  )
}

export default GalaxyLabel
