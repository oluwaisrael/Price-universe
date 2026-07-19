import styles from './Navbar.module.css'

function Navbar({ transparent = false }) {
  return (
    <header className={`${styles.navbar} ${transparent ? styles.navbarTransparent : ''}`}>
      <div className={styles.left}>
        <span className={styles.logo}>Price Intelligence</span>
      </div>
      <nav className={styles.right}>
        <a href="/" className={styles.navLink}>Home</a>
        <a href="#products" className={styles.navLink}>Products</a>
        <a href="#" className={styles.navLink}>About</a>
      </nav>
    </header>
  )
}

export default Navbar