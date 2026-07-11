import styles from './ProductCard.module.css'

// Field names match GET /api/products response: product_name, price
// (integer naira), url, site, category, image_url.
function formatPrice(price) {
  if (typeof price !== 'number') return '—'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)
}

function ProductCard({ product }) {
  const name = product?.product_name ?? 'Product name'
  const price = formatPrice(product?.price)
  const site = product?.site ?? 'Source'
  const imageUrl = product?.image_url

  return (
    <article className={styles.card}>
      {imageUrl ? (
        <img
          className={styles.image}
          src={imageUrl}
          alt={name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
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