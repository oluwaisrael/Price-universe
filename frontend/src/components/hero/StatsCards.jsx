import styles from './StatsCards.module.css'

function CubeIcon() {
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

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 21v-7m6 7v-4m6 4v-9m6 9V8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const STATS = [
  {
    id: 'tracked',
    icon: CubeIcon,
    value: '12,543',
    label: 'Products tracked',
  },
  {
    id: 'drops',
    icon: BellIcon,
    value: '2,341',
    label: 'Price drops today',
  },
  {
    id: 'accuracy',
    icon: TrendIcon,
    value: '98%',
    label: 'Accuracy rate',
  },
]

function StatsCards() {
  return (
    <div className={styles.container}>
      {STATS.map(({ id, icon: Icon, value, label }) => (
        <div key={id} className={styles.card}>
          <div className={styles.icon}>
            <Icon />
          </div>
          <div className={styles.content}>
            <div className={styles.value}>{value}</div>
            <div className={styles.label}>{label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatsCards