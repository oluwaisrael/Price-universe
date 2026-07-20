import styles from './FeatureStrip.module.css'

function RealtimeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l4 2" strokeLinecap="round" strokeLinejoin="round" />
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
      <path d="M3 21v-7m6 7v-4m6 4v-9m6 9V8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BrainIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8m3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
    </svg>
  )
}

function PriceChartSparkline() {
  return (
    <svg viewBox="0 0 100 40" className={styles.miniChart}>
      <polyline
        points="0,30 10,25 20,28 30,20 40,22 50,15 60,18 70,12 80,14 90,8 100,10"
        fill="none"
        stroke="url(#gradientChart)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <defs>
        <linearGradient id="gradientChart" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff9900" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ff9900" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function TrendingChart() {
  return (
    <svg viewBox="0 0 100 40" className={styles.miniChart}>
      <polyline
        points="0,35 15,28 30,22 45,18 60,12 75,8 90,5 100,3"
        fill="none"
        stroke="url(#gradientTrend)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <defs>
        <linearGradient id="gradientTrend" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22e5e5" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#22e5e5" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const FEATURES = [
  {
    id: 'realtime',
    icon: RealtimeIcon,
    title: 'Real-time Tracking',
    description: 'We track prices 24/7 across Jumia and Jiji so you don\'t have to.',
    demo: 'chart',
  },
  {
    id: 'alerts',
    icon: BellIcon,
    title: 'Price Drop Alerts',
    description: 'Get instant notifications when prices drop on products you care about.',
    demo: 'alert',
  },
  {
    id: 'history',
    icon: ChartIcon,
    title: 'Price History',
    description: 'View detailed price history and trends to buy at the perfect time.',
    demo: 'chart',
  },
  {
    id: 'ai',
    icon: BrainIcon,
    title: 'AI Predictions',
    description: 'Our AI analyzes trends to predict future price movements.',
    demo: 'prediction',
  },
]

function FeatureStrip() {
  return (
    <section className={styles.strip} aria-label="Key features">
      <div className={styles.header}>
        <h2 className={styles.heading}>Powerful insights. Smarter decisions.</h2>
        <p className={styles.subheading}>
          Everything you need to track prices and save money
        </p>
      </div>

      <div className={styles.grid}>
        {FEATURES.map(({ id, icon: Icon, title, description, demo }) => (
          <div key={id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                <Icon />
              </div>
              <h3 className={styles.cardTitle}>{title}</h3>
            </div>

            <p className={styles.cardDescription}>{description}</p>

            <div className={styles.demo}>
              {demo === 'chart' && id === 'realtime' && (
                <div className={styles.demoContent}>
                  <PriceChartSparkline />
                  <span className={styles.demoLabel}>-12%</span>
                </div>
              )}

              {demo === 'alert' && (
                <div className={styles.alertDemo}>
                  <div className={styles.alertIcon}>🔔</div>
                  <div className={styles.alertText}>
                    <div className={styles.alertTitle}>iPhone 13 dropped to ₦420,000</div>
                  </div>
                </div>
              )}

              {demo === 'chart' && id === 'history' && (
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
    </section>
  )
}

export default FeatureStrip