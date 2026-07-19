import { useMemo, useState } from 'react'
import PageShell from '../components/layout/PageShell'
import Hero from '../components/hero/Hero'
import FeatureStrip from '../components/featureStrip/FeatureStrip'
import ProductList from '../components/product/ProductList'
import { useProducts } from '../hooks/useProducts'
import styles from './Dashboard.module.css'

function Dashboard() {
  const [search, setSearch] = useState('')
  const { data: products, isLoading, error, refetch } = useProducts()

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products
    const query = search.trim().toLowerCase()
    return products.filter((product) =>
      (product.product_name ?? '').toLowerCase().includes(query)
    )
  }, [products, search])

  return (
    <PageShell transparentNav>
      <Hero searchValue={search} onSearchChange={setSearch} />
      <FeatureStrip />
      <section id="products" className={styles.productsSection}>
        <ProductList
          products={filteredProducts}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
        />
      </section>
    </PageShell>
  )
}

export default Dashboard