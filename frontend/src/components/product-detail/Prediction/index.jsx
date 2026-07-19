import { getMockPrediction } from '../../../services/mockProductData'
import styles from './Prediction.module.css'

function formatPrice(price) {
  if (typeof price !== 'number') return '—'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)
}

const TREND_LABEL = {
  rising: 'Likely to rise',
  falling: 'Likely to drop',
  stable: 'Likely to stay stable',
}

const SPARK_WIDTH = 240
const SPARK_HEIGHT = 60
const SPARK_PADDING = 6

function buildSparklinePath(points) {
  if (!points || points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const usableWidth = SPARK_WIDTH - SPARK_PADDING * 2
  const usableHeight = SPARK_HEIGHT - SPARK_PADDING * 2

  const coords = points.map((val, i) => {
    const x = SPARK_PADDING + (i / (points.length - 1)) * usableWidth
    const y = SPARK_PADDING + usableHeight - ((val - min) / range) * usableHeight
    return { x, y }
  })

  const d = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return { d, lastPoint: coords[coords.length - 1] }
}

function Prediction({ product }) {
  const prediction = getMockPrediction(product)
  const sparkline = buildSparklinePath(prediction.points)

  return (
    <div className={styles.wrapper}>
      <div className={styles.badgeRow}>
        <span className={styles.betaBadge}>Beta — mocked prediction</span>
      </div>

      <div className={styles.headline}>
        <span className={`${styles.trend} ${styles[`trend_${prediction.trend}`]}`}>
          {TREND_LABEL[prediction.trend]}
        </span>
        <span className={styles.confidence}>{prediction.confidence}% confidence</span>
      </div>

      {sparkline && (
        <svg
          className={styles.sparkline}
          viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Mocked 7-day price trend"
        >
          <path d={sparkline.d} className={styles.sparklineLine} fill="none" />
          <circle cx={sparkline.lastPoint.x} cy={sparkline.lastPoint.y} r="3" className={styles.sparklineDot} />
        </svg>
      )}

      <p className={styles.summary}>{prediction.reasoning}</p>

      <dl className={styles.statGrid}>
        <div className={styles.stat}>
          <dt>Predicted price</dt>
          <dd>{formatPrice(prediction.predictedPrice)}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Expected change</dt>
          <dd className={prediction.changePercent >= 0 ? styles.changePositive : styles.changeNegative}>
            {prediction.changePercent >= 0 ? '+' : ''}
            {prediction.changePercent}%
          </dd>
        </div>
        <div className={styles.stat}>
          <dt>Horizon</dt>
          <dd>7-day outlook</dd>
        </div>
      </dl>
    </div>
  )
}

export default Prediction