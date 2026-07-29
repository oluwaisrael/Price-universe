import PriceUniverse from '../../scenes/PriceUniverse/PriceUniverse'
import SearchInput from '../ui/SearchInput'
import PopularSearches from './PopularSearches'
import StatsCards from './StatsCards'
import styles from './Hero.module.css'

function Hero({ searchValue, onSearchChange }) {
  return (
    <section className={styles.hero}>
      <div className={styles.sceneBackground}>
        <PriceUniverse searchValue={searchValue} />
      </div>

      <div className={styles.content}>
        <span className={styles.eyebrow}>Welcome to Derin&apos;s</span>
        <h1 className={styles.title}>
          Price
          <br />
          <span className={styles.titleAccent}>Intelligence</span>
        </h1>
        <p className={styles.subtitle}>
          Track prices across Jumia and Jiji.
          <br />
          Get notified when prices drop.
        </p>
        <SearchInput value={searchValue} onChange={onSearchChange} />

        {!searchValue && (
          <PopularSearches onSearchSelect={onSearchChange} />
        )}

        <StatsCards />
      </div>

      <div className={styles.scrollCue}>
        <span className={styles.scrollLabel}>Scroll to explore</span>
        <svg className={styles.scrollArrow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  )
}

export default Hero
