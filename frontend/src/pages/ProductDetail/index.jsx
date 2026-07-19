import { useNavigate, useParams } from 'react-router-dom'
import { useProducts } from '../../hooks/useProducts'
import Header from '../../components/product-detail/Header'
import History from '../../components/product-detail/History'
import Prediction from '../../components/product-detail/Prediction'
import Information from '../../components/product-detail/Information'
import SimilarProducts from '../../components/product-detail/SimilarProducts'
import styles from './ProductDetail.module.css'

// Route param is named :id for a clean URL shape, but its value is
// the encoded product `url` — product rows have no confirmed id
// field, and url is already unique and guaranteed present.

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: products, isLoading, error } = useProducts()

  if (isLoading) {
    return <p className={styles.status}>Loading product…</p>
  }

  if (error) {
    return <p className={styles.status}>{error}</p>
  }

  const product = products.find((p) => p.url === decodeURIComponent(id))

  if (!product) {
    return <p className={styles.status}>Product not found.</p>
  }

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <Header product={product} />

      <History product={product} />

      <div className={styles.predictionInfoRow}>
        <Prediction product={product} />
        <Information product={product} />
      </div>

      <SimilarProducts product={product} />
    </div>
  )
}

export default ProductDetail