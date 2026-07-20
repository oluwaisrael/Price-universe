import styles from './Navbar.module.css'

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9z" strokeLinecap="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
    </svg>
  )
}

function Navbar({ transparent = false }) {
  return (
    <header className={`${styles.navbar} ${transparent ? styles.navbarTransparent : ''}`}>
      <div className={styles.left}>
        <div className={styles.logoIcon}>✨</div>
        <span className={styles.logo}>Price Intelligence</span>
      </div>
      <nav className={styles.center}>
        <a href="/" className={styles.navLink}>Home</a>
        <a href="#products" className={styles.navLink}>Products</a>
        <a href="#" className={styles.navLink}>About</a>
        <a href="#" className={styles.navLink}>How it works</a>
      </nav>
      <div className={styles.right}>
        <button className={styles.trackButton}>Track a Product</button>
        <button className={styles.bellButton} aria-label="Notifications">
          <BellIcon />
        </button>
      </div>
    </header>
  )
}

export default Navbar