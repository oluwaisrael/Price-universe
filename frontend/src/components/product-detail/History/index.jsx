import { useMemo, useState } from 'react'
import { useProductHistory, filterHistoryByRange } from '../../../hooks/useProductHistory'
import styles from './History.module.css'

const RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

const CHART_WIDTH = 600
const CHART_HEIGHT = 220
const PADDING = 24

function formatPrice(price) {
  if (typeof price !== 'number') return '—'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)
}

function formatShortDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}

// Turns a history slice into SVG point coordinates + derived markers.
// Isolated from render logic so it stays testable/readable on its own.
function buildChartGeometry(history) {
  const prices = history.map((row) => row.price).filter((p) => typeof p === 'number')
  if (prices.length < 2) return null

  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1

  const usableWidth = CHART_WIDTH - PADDING * 2
  const usableHeight = CHART_HEIGHT - PADDING * 2

  const points = history.map((row, i) => {
    const x = PADDING + (i / (history.length - 1)) * usableWidth
    const y = PADDING + usableHeight - ((row.price - minPrice) / priceRange) * usableHeight
    return { x, y, price: row.price, scrapedAt: row.scraped_at }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')

  const lowestPoint = points.reduce((min, p) => (p.price < min.price ? p : min), points[0])
  const highestPoint = points.reduce((max, p) => (p.price > max.price ? p : max), points[0])
  const currentPoint = points[points.length - 1]
  const firstPoint = points[0]

  const changePercent =
    firstPoint.price !== 0 ? Math.round(((currentPoint.price - firstPoint.price) / firstPoint.price) * 1000) / 10 : null

  return { points, pathD, lowestPoint, highestPoint, currentPoint, minPrice, maxPrice, changePercent }
}

function History({ product }) {
  const [rangeDays, setRangeDays] = useState(30)
  const { data, isLoading, error } = useProductHistory(product?.url)

  const filtered = useMemo(() => filterHistoryByRange(data, rangeDays), [data, rangeDays])
  const geometry = useMemo(() => buildChartGeometry(filtered), [filtered])

  if (isLoading) {
    return <div className={styles.wrapper}><p className={styles.message}>Loading price history…</p></div>
  }

  if (error) {
    return <div className={styles.wrapper}><p className={styles.message}>{error}</p></div>
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <div className={styles.rangeGroup} role="group" aria-label="Select time range">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              className={`${styles.rangeButton} ${rangeDays === range.days ? styles.rangeButtonActive : ''}`}
              onClick={() => setRangeDays(range.days)}
            >
              {range.label}
            </button>
          ))}
        </div>

        {geometry?.changePercent != null && (
          <span
            className={`${styles.changeBadge} ${geometry.changePercent >= 0 ? styles.changePositive : styles.changeNegative}`}
          >
            {geometry.changePercent >= 0 ? '+' : ''}
            {geometry.changePercent}% over this range
          </span>
        )}
      </div>

      {!geometry ? (
        <p className={styles.message}>Not enough data points in this range yet.</p>
      ) : (
        <>
          <svg
            className={styles.chart}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Price history line chart"
          >
            <path d={geometry.pathD} className={styles.line} fill="none" />

            {/* Lowest marker */}
            <circle cx={geometry.lowestPoint.x} cy={geometry.lowestPoint.y} r="4" className={styles.markerLow} />
            {/* Highest marker */}
            <circle cx={geometry.highestPoint.x} cy={geometry.highestPoint.y} r="4" className={styles.markerHigh} />
            {/* Current marker */}
            <circle cx={geometry.currentPoint.x} cy={geometry.currentPoint.y} r="5" className={styles.markerCurrent} />
          </svg>

          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={styles.dotLow} />
              Lowest: {formatPrice(geometry.lowestPoint.price)} ({formatShortDate(geometry.lowestPoint.scrapedAt)})
            </div>
            <div className={styles.legendItem}>
              <span className={styles.dotHigh} />
              Highest: {formatPrice(geometry.highestPoint.price)} ({formatShortDate(geometry.highestPoint.scrapedAt)})
            </div>
            <div className={styles.legendItem}>
              <span className={styles.dotCurrent} />
              Current: {formatPrice(geometry.currentPoint.price)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default History