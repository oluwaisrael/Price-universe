import { Billboard, Html } from '@react-three/drei'
import styles from './GalaxyLabel.module.css'


function GalaxyLabel({ center, site, count, color }) {
  const position = [center.x, 5.5, center.z]

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
