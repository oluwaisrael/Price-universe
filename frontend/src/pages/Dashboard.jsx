import { useMemo, useState } from 'react'
import PageShell from '../components/layout/PageShell'
import Hero from '../components/hero/Hero'
import FeatureStrip from '../components/featureStrip/FeatureStrip'
import ProductList from '../components/product/ProductList'
import { useProducts } from '../hooks/useProducts'
import styles from './Dashboard.module.css'

// Phase 3: wired to the live backend via useProducts(). Search is a
// simple client-side filter on the fetched list for now — swapping to
// a server-side search/history lookup is a later phase.
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
    <PageShell>
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