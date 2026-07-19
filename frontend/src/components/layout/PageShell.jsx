import Navbar from './Navbar'
import styles from './PageShell.module.css'

function PageShell({ children, transparentNav = false }) {
  return (
    <div className={styles.shell}>
      <Navbar transparent={transparentNav} />
      <main className={styles.main}>{children}</main>
    </div>
  )
}

export default PageShell