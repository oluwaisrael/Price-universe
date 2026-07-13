import styles from './FeatureStrip.module.css'

// Small line-style icons, drawn inline so no icon library dependency is
// introduced. Each is a simple 24x24 stroke icon in the accent color.
function UniverseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(35 12 12)" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

function GalaxiesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8.5" cy="12" r="5.5" />
      <circle cx="8.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="8" r="3" />
      <circle cx="17" cy="8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ImageNodeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 16l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16" />
      <path d="M13.5 14.5l1.5-1.5a1.5 1.5 0 0 1 2.1 0L20 16" />
    </svg>
  )
}

function SearchNavigateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="6" />
      <path d="M14.5 14.5L20 20" strokeLinecap="round" />
      <path d="M10 7.5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
    </svg>
  )
}

function PriceHeightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3v18" strokeLinecap="round" />
      <path d="M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="6" y="15" width="3" height="4" />
      <rect x="10.5" y="12" width="3" height="7" />
      <rect x="15" y="9" width="3" height="10" />
    </svg>
  )
}

function RealtimeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 13a9 9 0 0 1 15.5-6.3" strokeLinecap="round" />
      <path d="M21 11a9 9 0 0 1-15.5 6.3" strokeLinecap="round" />
      <path d="M18.5 3.5v4h-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 20.5v-4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HistoryTrendsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 20V4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 15l3.5-4 3 2.5L18.5 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AIPredictionsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="4.5" r="1.4" />
      <circle cx="19.5" cy="12" r="1.4" />
      <circle cx="12" cy="19.5" r="1.4" />
      <circle cx="4.5" cy="12" r="1.4" />
      <path d="M12 6.3v3.3M12 14.4v3.3M14.4 12h3.3M6.3 12h3.3" strokeLinecap="round" />
    </svg>
  )
}

const FEATURES = [
  {
    icon: UniverseIcon,
    title: '3D Universe',
    description: 'Explore products in an interactive galaxy',
  },
  {
    icon: GalaxiesIcon,
    title: 'Two Galaxies',
    description: 'Jumia and Jiji data clusters',
  },
  {
    icon: ImageNodeIcon,
    title: 'Image Nodes',
    description: 'Product images as interactive nodes',
  },
  {
    icon: SearchNavigateIcon,
    title: 'Search to Navigate',
    description: 'Search flies camera to the product',
  },
  {
    icon: PriceHeightIcon,
    title: 'Price Height',
    description: 'Higher price = higher in space',
  },
  {
    icon: RealtimeIcon,
    title: 'Real-time Data',
    description: 'Live scraping and price updates',
  },
  {
    icon: HistoryTrendsIcon,
    title: 'History & Trends',
    description: 'Visualize price history with beautiful charts',
  },
  {
    icon: AIPredictionsIcon,
    title: 'AI Predictions',
    description: 'ML insights for future price movements',
  },
]

function FeatureStrip() {
  return (
    <section className={styles.strip} aria-label="Key features">
      <ul className={styles.list}>
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <li key={title} className={styles.item}>
            <span className={styles.icon}>
              <Icon />
            </span>
            <span className={styles.title}>{title}</span>
            <span className={styles.description}>{description}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default FeatureStrip
