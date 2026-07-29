import ProductCard from './ProductCard'
import LoadingState from '../ui/LoadingState'
import ErrorState from '../ui/ErrorState'
import styles from './ProductList.module.css'

function ProductList({ products = [], isLoading = false, error = null, onRetry }) {
  if (isLoading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />
  }

  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <p className={styles.emptyTitle}>No products found</p>
        <p className={styles.emptyHint}>Search above or try a popular product to get started.</p>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.id ?? product.url} product={product} />
      ))}
    </div>
  )
}

export default ProductList
