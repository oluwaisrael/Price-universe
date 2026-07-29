import { useNavigate } from 'react-router-dom'
import styles from './DetailPanel.module.css'

function formatPrice(price) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)
}

function formatScrapedAt(iso) {
  if (!iso) return 'Unknown'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffHours / 24)
  return `${diffDays}d ago`
}

function DetailPanel({ node, onClose }) {
  const navigate = useNavigate()

  if (!node) return null

  function goToFullDetail() {
    if (!node.url) return
    navigate(`/product/${encodeURIComponent(node.url)}`)
  }

  return (
    <aside className={styles.panel}>
      <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
        ×
      </button>

      {node.image && (
        <div className={styles.imageWrap}>
          <img src={node.image} alt={node.name} className={styles.image} />
        </div>
      )}

      <h2 className={styles.name}>{node.name}</h2>
      <span className={styles.site} style={{ color: node.color }}>
        {node.site}
      </span>

      <div className={styles.priceBlock}>
        <span className={styles.priceLabel}>Current Price</span>
        <span className={styles.price}>{formatPrice(node.price)}</span>
      </div>

      <div className={styles.metaRow}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Category</span>
          <span className={styles.metaValue}>{node.category ?? 'Uncategorized'}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Last Scraped</span>
          <span className={styles.metaValue}>{formatScrapedAt(node.scrapedAt)}</span>
        </div>
      </div>

      <div className={styles.actions}>
        {node.url && (
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.viewButton}
            style={{ backgroundColor: node.color }}
          >
            View on {node.site}
          </a>
        )}
        <button type="button" className={styles.detailButton} onClick={goToFullDetail}>
          Full details
        </button>
      </div>
    </aside>
  )
}

export default DetailPanel
