import { useEffect, useState } from 'react'
import { trackProduct } from '../../services/track'
import styles from './TrackModal.module.css'

export default function TrackModal({ open, onClose }) {
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!open) {
      setUrl('')
      setEmail('')
      setError('')
      setSuccess('')
      setLoading(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    const trimmed = url.trim()
    if (!trimmed) {
      setError('Paste a Jumia or Jiji product link.')
      return
    }
    setLoading(true)
    try {
      const res = await trackProduct({ url: trimmed, email: email.trim() || undefined })
      const site = res?.tracked?.site || 'product'
      setSuccess(`Tracking started on ${site}. We’ll watch this listing for price drops.`)
      setUrl('')
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Could not add this product. Check the URL and try again.'
      setError(typeof msg === 'string' ? msg : 'Could not add this product.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="track-title"
      >
        <div className={styles.header}>
          <h2 id="track-title" className={styles.title}>
            Track a product
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className={styles.subtitle}>
          Paste a Jumia or Jiji product URL. We’ll watch the price and flag drops.
        </p>

        <form onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="track-url">
            Product URL
          </label>
          <input
            id="track-url"
            className={styles.input}
            type="url"
            placeholder="https://www.jumia.com.ng/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />

          <label className={styles.label} htmlFor="track-email">
            Email (optional)
          </label>
          <input
            id="track-email"
            className={styles.input}
            type="email"
            placeholder="you@email.com — for drop alerts later"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? 'Adding…' : 'Start tracking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
