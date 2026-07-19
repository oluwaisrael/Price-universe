import PriceUniverse from '../../scenes/PriceUniverse/PriceUniverse'
import SearchInput from '../ui/SearchInput'
import styles from './Hero.module.css'

function Hero({ searchValue, onSearchChange }) {
  return (
    <section className={styles.hero}>
      <div className={styles.sceneBackground}>
        <PriceUniverse searchValue={searchValue} />
      </div>

      <div className={styles.content}>
        <span className={styles.eyebrow}>Welcome to Derin's Price Intelligence</span>
        <h1 className={styles.title}>Track prices across Jumia and Jiji</h1>
        <p className={styles.subtitle}>
          Search a product to see its price history and get notified when it drops.
        </p>
        <SearchInput value={searchValue} onChange={onSearchChange} />
      </div>
    </section>
  )
}

export default Hero