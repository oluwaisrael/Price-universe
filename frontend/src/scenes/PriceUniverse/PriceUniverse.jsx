import { useState, useMemo, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
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
      // Prefer exact name match, then startsWith, then includes
      const q = query
      const scored = nodes
        .map((n) => {
          const name = (n.name ?? '').toLowerCase()
          const site = (n.site ?? '').toLowerCase()
          let score = 0
          if (name === q) score = 100
          else if (name.startsWith(q)) score = 80
          else if (name.includes(q)) score = 50
          else if (site.includes(q)) score = 20
          return { n, score }
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
      setSelectedId(scored[0]?.n.id ?? null)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [searchValue, nodes])

  return (
    <div className={styles.canvasWrapper}>
      <Canvas
        camera={{ position: [70, 28, 125], fov: 48, far: 2000 }}
        dpr={[1, 1.75]}
        onPointerMissed={() => setSelectedId(null)}
      >
        <SpaceScene
          nodes={nodes}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <EffectComposer>
          <Bloom
            intensity={0.55}
            luminanceThreshold={0.4}
            luminanceSmoothing={0.3}
            mipmapBlur
          />
          <Noise opacity={0.03} />
          <Vignette eskil={false} offset={0.12} darkness={0.48} />
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
