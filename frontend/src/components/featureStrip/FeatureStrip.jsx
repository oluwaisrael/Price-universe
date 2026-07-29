import styles from './FeatureStrip.module.css'

function RealtimeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7v10l10 5 10-5V7l-10-5z" />
      <path d="M2 7l10 5v10" />
      <path d="M12 12v10M22 7l-10 5v10" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9z" strokeLinecap="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 7h7v7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BrainIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M12 4a4 4 0 0 0-4 4c0 1.1.4 2.1 1.1 2.8A4 4 0 0 0 8 14c0 1.5.8 2.8 2 3.5V20h4v-2.5c1.2-.7 2-2 2-3.5a4 4 0 0 0-1.1-2.7A4 4 0 0 0 16 8a4 4 0 0 0-4-4z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 10h.01M15 10h.01" strokeLinecap="round" />
    </svg>
  )
}

function PriceChartSparkline() {
  return (
    <svg viewBox="0 0 100 36" className={styles.miniChart} preserveAspectRatio="none">
      <defs>
        <linearGradient id="gradientChart" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="fillChart" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points="0,36 0,28 10,24 20,26 30,18 40,20 50,12 60,15 70,9 80,11 90,5 100,7 100,36"
        fill="url(#fillChart)"
      />
      <polyline
        points="0,28 10,24 20,26 30,18 40,20 50,12 60,15 70,9 80,11 90,5 100,7"
        fill="none"
        stroke="url(#gradientChart)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function TrendingChart() {
  return (
    <svg viewBox="0 0 100 36" className={styles.miniChart} preserveAspectRatio="none">
      <defs>
        <linearGradient id="gradientTrend" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22e5e5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#22e5e5" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="fillTrend" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22e5e5" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#22e5e5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points="0,36 0,32 15,26 30,20 45,16 60,11 75,7 90,4 100,2 100,36"
        fill="url(#fillTrend)"
      />
      <polyline
        points="0,32 15,26 30,20 45,16 60,11 75,7 90,4 100,2"
        fill="none"
        stroke="url(#gradientTrend)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

const FEATURES = [
  {
    id: 'realtime',
    icon: RealtimeIcon,
    title: 'Real-time Tracking',
    description: "We track prices 24/7 across Jumia and Jiji so you don't have to.",
    accent: 'purple',
    demo: 'chart',
  },
  {
    id: 'alerts',
    icon: BellIcon,
    title: 'Price Drop Alerts',
    description: 'Get instant notifications when prices drop on products you care about.',
    accent: 'orange',
    demo: 'alert',
  },
  {
    id: 'history',
    icon: ChartIcon,
    title: 'Price History',
    description: 'View detailed price history and trends to buy at the perfect time.',
    accent: 'teal',
    demo: 'history',
  },
  {
    id: 'ai',
    icon: BrainIcon,
    title: 'AI Predictions',
    description: 'Our AI analyzes trends to predict future price movements.',
    accent: 'violet',
    demo: 'prediction',
  },
]

function FeatureStrip() {
  return (
    <section className={styles.strip} aria-label="Key features">
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Powerful insights. Smarter decisions.</h2>
          <p className={styles.subheading}>
            Everything you need to track prices and save money
          </p>
        </div>

        <div className={styles.grid}>
          {FEATURES.map(({ id, icon: Icon, title, description, accent, demo }) => (
            <div key={id} className={`${styles.card} ${styles[`card_${accent}`]}`}>
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIcon} ${styles[`icon_${accent}`]}`}>
                  <Icon />
                </div>
                <h3 className={styles.cardTitle}>{title}</h3>
              </div>

              <p className={styles.cardDescription}>{description}</p>

              <div className={styles.demo}>
                {demo === 'chart' && (
                  <div className={styles.demoContent}>
                    <PriceChartSparkline />
                    <span className={`${styles.demoBadge} ${styles.badge_purple}`}>-12%</span>
                  </div>
                )}

                {demo === 'alert' && (
                  <div className={styles.alertDemo}>
                    <span className={styles.alertIcon} aria-hidden>🔔</span>
                    <span className={styles.alertText}>
                      iPhone 13 dropped to ₦420,000
                    </span>
                  </div>
                )}

                {demo === 'history' && (
                  <div className={styles.demoContent}>
                    <TrendingChart />
                  </div>
                )}

                {demo === 'prediction' && (
                  <div className={styles.predictionDemo}>
                    <span className={styles.predLabel}>Likely to drop</span>
                    <span className={styles.predValue}>87%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeatureStrip
