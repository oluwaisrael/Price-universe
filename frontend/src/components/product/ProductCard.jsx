import { useNavigate } from 'react-router-dom'
import { BASE_URL } from '../../api/client'
import styles from './ProductCard.module.css'

function formatPrice(price) {
  if (typeof price !== 'number') return '—'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)
}

function proxiedImageUrl(imageUrl) {
  if (!imageUrl) return null
  return `${BASE_URL}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
}

function siteAccent(site) {
  const s = (site ?? '').toLowerCase()
  if (s.includes('jumia')) return 'jumia'
  if (s.includes('jiji')) return 'jiji'
  return 'default'
}

function ProductCard({ product }) {
  const navigate = useNavigate()
  const name = product?.product_name ?? 'Product name'
  const price = formatPrice(product?.price)
  const site = product?.site ?? 'Source'
  const imageUrl = proxiedImageUrl(product?.image_url)
  const accent = siteAccent(site)

  function goToDetail() {
    if (!product?.url) return
    navigate(`/product/${encodeURIComponent(product.url)}`)
  }

  return (
    <article
      className={styles.card}
      onClick={goToDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          goToDetail()
        }
      }}
    >
      <div className={styles.imageWrap}>
        {imageUrl ? (
          <img className={styles.image} src={imageUrl} alt={name} loading="lazy" />
        ) : (
          <div className={styles.imagePlaceholder}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
        <span className={`${styles.siteBadge} ${styles[`site_${accent}`]}`}>
          {site}
        </span>
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>{name}</h3>
        <div className={styles.meta}>
          <p className={styles.price}>{price}</p>
        </div>
      </div>
    </article>
  )
}

export default ProductCard
