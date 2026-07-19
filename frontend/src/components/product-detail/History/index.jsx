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

// Finds the closest chart point to a mouse x-position, for hover tooltips.
function findClosestPoint(points, mouseX) {
  if (!points || points.length === 0) return null
  return points.reduce((closest, p) => (Math.abs(p.x - mouseX) < Math.abs(closest.x - mouseX) ? p : closest), points[0])
}

function History({ product }) {
  const [rangeDays, setRangeDays] = useState(30)
  const [hoverPoint, setHoverPoint] = useState(null)
  const { data, isLoading, error } = useProductHistory(product?.url)

  const filtered = useMemo(() => filterHistoryByRange(data, rangeDays), [data, rangeDays])
  const geometry = useMemo(() => buildChartGeometry(filtered), [filtered])

  function handleMouseMove(e) {
    if (!geometry) return
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const scaleX = CHART_WIDTH / rect.width
    const mouseX = (e.clientX - rect.left) * scaleX
    setHoverPoint(findClosestPoint(geometry.points, mouseX))
  }

  function handleMouseLeave() {
    setHoverPoint(null)
  }

  if (isLoading) {
    return <div className={styles.wrapper}><p className={styles.message}>Loading price history…</p></div>
  }

  if (error) {
    return <div className={styles.wrapper}><p className={styles.message}>{error}</p></div>
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <div className={styles.titleGroup}>
          <h3 className={styles.panelTitle}>Price History</h3>
          <p className={styles.panelSubtitle}>Track how the price has changed over time</p>
        </div>

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
      </div>

      {!geometry ? (
        <p className={styles.message}>Not enough data points in this range yet.</p>
      ) : (
        <>
          <div className={styles.chartWrapper}>
            <svg
              className={styles.chart}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Price history line chart"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <path d={geometry.pathD} className={styles.line} fill="none" />

              <circle cx={geometry.lowestPoint.x} cy={geometry.lowestPoint.y} r="4" className={styles.markerLow} />
              <circle cx={geometry.highestPoint.x} cy={geometry.highestPoint.y} r="4" className={styles.markerHigh} />
              <circle cx={geometry.currentPoint.x} cy={geometry.currentPoint.y} r="5" className={styles.markerCurrent} />

              {hoverPoint && (
                <>
                  <line
                    x1={hoverPoint.x}
                    y1={PADDING}
                    x2={hoverPoint.x}
                    y2={CHART_HEIGHT - PADDING}
                    className={styles.hoverLine}
                  />
                  <circle cx={hoverPoint.x} cy={hoverPoint.y} r="5" className={styles.hoverDot} />
                </>
              )}
            </svg>

            {/* Inline annotation bubbles for lowest/highest, positioned over the SVG using percentage coords */}
            <div
              className={styles.bubbleLow}
              style={{
                left: `${(geometry.lowestPoint.x / CHART_WIDTH) * 100}%`,
                top: `${(geometry.lowestPoint.y / CHART_HEIGHT) * 100}%`,
              }}
            >
              Lowest<br />{formatPrice(geometry.lowestPoint.price)}
            </div>
            <div
              className={styles.bubbleHigh}
              style={{
                left: `${(geometry.highestPoint.x / CHART_WIDTH) * 100}%`,
                top: `${(geometry.highestPoint.y / CHART_HEIGHT) * 100}%`,
              }}
            >
              Highest<br />{formatPrice(geometry.highestPoint.price)}
            </div>

            {hoverPoint && (
              <div
                className={styles.tooltip}
                style={{
                  left: `${(hoverPoint.x / CHART_WIDTH) * 100}%`,
                  top: `${Math.max((hoverPoint.y / CHART_HEIGHT) * 100 - 12, 4)}%`,
                }}
              >
                <span className={styles.tooltipDate}>{formatShortDate(hoverPoint.scrapedAt)}</span>
                <span className={styles.tooltipPrice}>{formatPrice(hoverPoint.price)}</span>
              </div>
            )}
          </div>

          <div className={styles.footer}>
            {geometry.changePercent != null && (
              <span className={styles.changeText}>
                Price {geometry.changePercent >= 0 ? 'rose' : 'dropped'}{' '}
                <strong className={geometry.changePercent >= 0 ? styles.changePositive : styles.changeNegative}>
                  {Math.abs(geometry.changePercent)}%
                </strong>{' '}
                in the last {rangeDays} days
              </span>
            )}
            <span className={styles.rangeNote}>Showing data for last {rangeDays} days</span>
          </div>
        </>
      )}
    </div>
  )
}

export default History