import styles from './SearchInput.module.css'

function SearchInput({ value, onChange, placeholder = 'Search a product or paste a Jumia/Jiji URL' }) {
  const handleClear = () => {
    onChange('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
  }

  return (
    <form className={styles.wrapper} onSubmit={handleSubmit}>
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>

      <input
        type="text"
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      {value && (
        <button type="button" className={styles.clearButton} onClick={handleClear} aria-label="Clear search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      <button type="submit" className={styles.submitButton} aria-label="Search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>
    </form>
  )
}

export default SearchInput
