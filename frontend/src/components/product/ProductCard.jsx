import { BASE_URL } from '../../api/client'
import styles from './ProductCard.module.css'

// Field names match GET /api/products response: product_name, price
// (integer naira), url, site, category.
function formatPrice(price) {
  if (typeof price !== 'number') return '—'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)
}

// Jumia/Jiji CDN images block direct browser fetches (hotlink/CORS
// protection) — route through the backend's server-to-server proxy
// instead, same as the PriceUniverse 3D scene does.
function proxiedImageUrl(imageUrl) {
  if (!imageUrl) return null
  return `${BASE_URL}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
}

function ProductCard({ product }) {
  const name = product?.product_name ?? 'Product name'
  const price = formatPrice(product?.price)
  const site = product?.site ?? 'Source'
  const imageUrl = proxiedImageUrl(product?.image_url)

  return (
    <article className={styles.card}>
      {imageUrl ? (
        <img
          className={styles.image}
          src={imageUrl}
          alt={name}
        />
      ) : (
        <div className={styles.imageArea} />
      )}
      <div className={styles.body}>
        <h3 className={styles.name}>
          {product?.url ? (
            <a href={product.url} target="_blank" rel="noreferrer">
              {name}
            </a>
          ) : (
            name
          )}
        </h3>
        <p className={styles.price}>{price}</p>
        <span className={styles.source}>{site}</span>
      </div>
    </article>
  )
}

export default ProductCard
