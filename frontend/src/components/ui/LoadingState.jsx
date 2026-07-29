import styles from './LoadingState.module.css'

function LoadingState({ message = 'Loading products…' }) {
  return (
    <div className={styles.loading} role="status">
      <div className={styles.spinner} aria-hidden />
      <span className={styles.message}>{message}</span>
    </div>
  )
}

export default LoadingState
