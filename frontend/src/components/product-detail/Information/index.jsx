import { getMockDescription, getMockSpecifications } from '../../../services/mockProductData'
import styles from './Information.module.css'

function Information({ product }) {
  const description = getMockDescription(product)
  const specifications = getMockSpecifications(product)

  return (
    <div className={styles.wrapper}>
        <h3 className={styles.panelHeading}>Product Information</h3>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Description</h3>
        <p className={styles.description}>{description}</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Specifications</h3>
        <dl className={styles.specList}>
          {specifications.map((spec) => (
            <div key={spec.label} className={styles.specRow}>
              <dt>{spec.label}</dt>
              <dd>{spec.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Listing details</h3>
        <dl className={styles.specList}>
          <div className={styles.specRow}>
            <dt>Marketplace</dt>
            <dd>{product?.site ?? '—'}</dd>
          </div>
          <div className={styles.specRow}>
            <dt>Seller</dt>
            <dd>{product?.seller ?? '—'}</dd>
          </div>
          <div className={styles.specRow}>
            <dt>Category</dt>
            <dd>{product?.category ?? '—'}</dd>
          </div>
          {product?.url && (
            <div className={styles.specRow}>
              <dt>Link</dt>
              <dd>
                <a href={product.url} target="_blank" rel="noreferrer" className={styles.link}>
                  View original listing
                </a>
              </dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  )
}

export default Information