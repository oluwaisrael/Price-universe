import { Component } from 'react'

/**
 * ImageErrorBoundary — catches texture-load failures for a single
 * ProductImage so a broken/CORS-blocked/404 image URL can't crash the
 * whole PriceUniverse scene. React error boundaries must be class
 * components; function components can't implement
 * getDerivedStateFromError / componentDidCatch.
 *
 * Scoped per-node (wraps one <ProductImage>), not scene-wide, so one
 * bad image only silently disappears rather than taking down every
 * other node.
 */
class ImageErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    if (this.props.onError) this.props.onError(error)
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}

export default ImageErrorBoundary
