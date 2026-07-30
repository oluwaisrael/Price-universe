import { useState, useMemo, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Vignette, Noise } from '@react-three/postprocessing'
import { useProducts } from '../../hooks/useProducts'
import { normalizeProducts } from './normalizeProducts'
import { computeGalaxyLayout } from './galaxyLayout'
import DetailPanel from './DetailPanel'
import styles from './PriceUniverse.module.css'
import SpaceScene from './scene/SpaceScene'

const SEARCH_DEBOUNCE_MS = 500

function PriceUniverse({ searchValue = '' }) {
  const { data: rawProducts, isLoading, error } = useProducts()
  const [selectedId, setSelectedId] = useState(null)
  const debounceRef = useRef(null)

  const normalized = useMemo(() => normalizeProducts(rawProducts), [rawProducts])
  const nodes = useMemo(() => computeGalaxyLayout(normalized), [normalized])
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const query = searchValue.trim().toLowerCase()
      if (!query) {
        setSelectedId(null)
        return
      }
      const match = nodes.find((n) => (n.name ?? '').toLowerCase().includes(query))
      setSelectedId(match ? match.id : null)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [searchValue, nodes])

  return (
    <div className={styles.canvasWrapper}>
      <Canvas
        camera={{ position: [30, 45, 88], fov: 50, far: 2000 }}
        onPointerMissed={() => setSelectedId(null)}
      >
        <SpaceScene />
        {/* Stage 2: no bloom — core must look good without it */}
        <EffectComposer>
          <Noise opacity={0.035} />
          <Vignette eskil={false} offset={0.14} darkness={0.5} />
        </EffectComposer>
      </Canvas>

      {isLoading && (
        <div className={styles.statusOverlay}>
          <div className={styles.statusCard}>
            <span className={styles.statusText}>Loading the universe...</span>
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className={styles.statusOverlay}>
          <div className={styles.statusCard}>
            <span className={styles.statusText}>Couldn't load products.</span>
            <span className={styles.statusSubtext}>{String(error)}</span>
          </div>
        </div>
      )}

      <DetailPanel node={selectedNode} onClose={() => setSelectedId(null)} />
    </div>
  )
}

export default PriceUniverse
