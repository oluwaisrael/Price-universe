import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProducts } from '../../../hooks/useProducts'
import { BASE_URL } from '../../../api/client'
import styles from './SimilarProducts.module.css'

const MAX_RESULTS = 8

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

  const similar = useMemo(() => {
    if (!products || !product?.category) return []
    return products
      .filter((p) => p.category === product.category && p.url !== product.url)
      .slice(0, MAX_RESULTS)
  }, [products, product])

  if (isLoading) {
    return <p className={styles.message}>Loading similar products…</p>
  }

  if (error) {
    return <p className={styles.message}>{error}</p>
  }

  if (similar.length === 0) {
    return <p className={styles.message}>No similar products found in this category yet.</p>
  }

  return (
    <div className={styles.grid}>
      {similar.map((item) => {
        const imageUrl = proxiedImageUrl(item.image_url)
        const priceDiff =
          typeof item.price === 'number' && typeof product?.price === 'number' ? item.price - product.price : null

        return (
          <button
            key={item.url}
            type="button"
            className={styles.card}
            onClick={() => navigate(`/product/${encodeURIComponent(item.url)}`)}
          >
            {imageUrl ? (
              <img className={styles.image} src={imageUrl} alt={item.product_name} />
            ) : (
              <div className={styles.imagePlaceholder} />
            )}

            <span className={styles.name}>{item.product_name}</span>
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
  )
}

export default SimilarProducts