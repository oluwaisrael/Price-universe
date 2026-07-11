import { useCallback, useEffect, useRef, useState } from 'react'
import { getProducts } from '../services/products'

// Fetches the product list from the backend on mount.
// Exposes { data, isLoading, error, refetch } so Dashboard can wire
// these directly into <ProductList />.
export function useProducts() {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const requestId = useRef(0)

  const fetchProducts = useCallback(() => {
    const currentRequest = ++requestId.current
    setIsLoading(true)
    setError(null)

    getProducts()
      .then((products) => {
        if (requestId.current !== currentRequest) return
        setData(products)
      })
      .catch((err) => {
        if (requestId.current !== currentRequest) return
        setError(err.message || 'Failed to load products.')
      })
      .finally(() => {
        if (requestId.current !== currentRequest) return
        setIsLoading(false)
      })
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect -- standard fetch-on-mount; fetchProducts guards against stale responses via requestId */
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])
  /* eslint-enable react-hooks/set-state-in-effect */

  return { data, isLoading, error, refetch: fetchProducts }
}
