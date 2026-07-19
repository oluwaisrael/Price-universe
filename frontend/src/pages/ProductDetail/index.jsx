import { useNavigate, useParams } from 'react-router-dom'
import { useProducts } from '../../hooks/useProducts'
import Header from '../../components/product-detail/Header'
import Tabs from '../../components/product-detail/Tabs'
import History from '../../components/product-detail/History'
import Prediction from '../../components/product-detail/Prediction'
import Information from '../../components/product-detail/Information'
import styles from './ProductDetail.module.css'
import SimilarProducts from '../../components/product-detail/SimilarProducts'

// Route param is named :id for a clean URL shape, but its value is
// the encoded product `url` — product rows have no confirmed id
// field, and url is already unique and guaranteed present.

const TABS = [
  { id: 'history', label: 'Price History', Component: History },
  { id: 'prediction', label: 'AI Prediction', Component: Prediction },
  { id: 'information', label: 'Information', Component: Information },
  { id: 'similar', label: 'Similar Products', Component: SimilarProducts },
]


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

      <Tabs tabs={TABS} product={product} />
    </div>
  )
}

export default ProductDetail