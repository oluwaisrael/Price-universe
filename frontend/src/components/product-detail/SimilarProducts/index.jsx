import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProducts } from '../../../hooks/useProducts'
import { BASE_URL } from '../../../api/client'
import styles from './SimilarProducts.module.css'

const MAX_RESULTS = 10

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

function SimilarProducts({ product }) {
  const navigate = useNavigate()
  const { data: products, isLoading, error } = useProducts()
  const [likedUrls, setLikedUrls] = useState(() => new Set())

  const similar = useMemo(() => {
    if (!products || !product?.category) return []
    return products
      .filter((p) => p.category === product.category && p.url !== product.url)
      .slice(0, MAX_RESULTS)
  }, [products, product])

  function toggleLike(e, url) {
    e.stopPropagation()
    setLikedUrls((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  if (isLoading) {
    return <div className={styles.wrapper}><p className={styles.message}>Loading similar products…</p></div>
  }

  if (error) {
    return <div className={styles.wrapper}><p className={styles.message}>{error}</p></div>
  }

  if (similar.length === 0) {
    return <div className={styles.wrapper}><p className={styles.message}>No similar products found in this category yet.</p></div>
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.panelTitle}>Similar Products</h3>
          <p className={styles.panelSubtitle}>Other products you might be interested in</p>
        </div>
      </div>

      <div className={styles.scrollRow}>
        {similar.map((item) => {
          const imageUrl = proxiedImageUrl(item.image_url)
          const priceDiff =
            typeof item.price === 'number' && typeof product?.price === 'number' ? item.price - product.price : null
          const isLiked = likedUrls.has(item.url)

          return (
            <button
              key={item.url}
              type="button"
              className={styles.card}
              onClick={() => navigate(`/product/${encodeURIComponent(item.url)}`)}
            >
              <div className={styles.imageWrap}>
                {imageUrl ? (
                  <img className={styles.image} src={imageUrl} alt={item.product_name} />
                ) : (
                  <div className={styles.imagePlaceholder} />
                )}
                <span
                  className={`${styles.heartButton} ${isLiked ? styles.heartLiked : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => toggleLike(e, item.url)}
                  aria-label={isLiked ? 'Unlike' : 'Like'}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
                  </svg>
                </span>
              </div>

              <span className={styles.name}>{item.product_name}</span>
              <span className={styles.site}>{item.site}</span>
              <span className={styles.price}>{formatPrice(item.price)}</span>

              {priceDiff != null && priceDiff !== 0 && (
                <span className={priceDiff < 0 ? styles.cheaper : styles.pricier}>
                  {priceDiff < 0 ? '↓' : '↑'} {formatPrice(Math.abs(priceDiff))} {priceDiff < 0 ? 'cheaper' : 'pricier'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default SimilarProducts