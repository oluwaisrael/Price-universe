import styles from './PopularSearches.module.css'

const POPULAR_ITEMS = ['iPhone 13', 'PlayStation 5', 'MacBook Pro', 'Samsung S24']

function PopularSearches({ onSearchSelect }) {
  return (
    <div className={styles.container}>
      <span className={styles.label}>Popular searches</span>
      <div className={styles.tags}>
        {POPULAR_ITEMS.map((item) => (
          <button
            key={item}
            className={styles.tag}
            onClick={() => onSearchSelect(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}

export default PopularSearches