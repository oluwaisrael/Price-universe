import { useCallback, useEffect, useState } from 'react'
import { getStats } from '../services/stats'

export function useStats() {
  const [data, setData] = useState({ productsTracked: null, priceDropsToday: null })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    getStats()
      .then((stats) => {
        if (!cancelled) {
          setData(stats)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err)
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cancel = fetchStats()
    return cancel
  }, [fetchStats])

  return { data, isLoading, error, refetch: fetchStats }
}
