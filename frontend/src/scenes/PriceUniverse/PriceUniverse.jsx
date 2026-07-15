import { Suspense, useState, useMemo, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useProducts } from '../../hooks/useProducts'
import { normalizeProducts } from './normalizeProducts'
import { computeGalaxyLayout, getGalaxyCenters, getGalaxyRadius } from './galaxyLayout'
import ProductNode from './ProductNode'
import GalaxyCore from './GalaxyCore'
import GalaxyStarfield from './GalaxyStarfield'
import GalaxyNebula from './GalaxyNebula'
import GalaxyOrbitRings from './GalaxyOrbitRings'
import GalaxyLabel from './GalaxyLabel'
import CameraRig from './CameraRig'
import DetailPanel from './DetailPanel'
import styles from './PriceUniverse.module.css'

const SEARCH_DEBOUNCE_MS = 500


const GALAXY_CORE_COLORS = {
  Jumia: '#ff9900',
  Jiji: '#22e5e5',
}


function PriceUniverse({ searchValue = '' }) {
  const { data: rawProducts, isLoading, error } = useProducts()
  const [selectedId, setSelectedId] = useState(null)
  const debounceRef = useRef(null)

  const normalized = useMemo(() => normalizeProducts(rawProducts), [rawProducts])
  const nodes = useMemo(() => computeGalaxyLayout(normalized), [normalized])
  const galaxyCenters = useMemo(() => getGalaxyCenters(), [])
  const galaxyRadius = useMemo(() => getGalaxyRadius(), [])
  const siteCounts = useMemo(() => {
    const counts = {}
    for (const node of nodes) {
      counts[node.site] = (counts[node.site] ?? 0) + 1
    }
    return counts
  }, [nodes])
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId]
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      const query = searchValue.trim().toLowerCase()

      if (!query) {
        setSelectedId(null)
        return
      }

      const match = nodes.find((n) => n.name.toLowerCase().includes(query))
      setSelectedId(match ? match.id : null)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(debounceRef.current)
  }, [searchValue, nodes])

  return (
    <div className={styles.canvasWrapper}>
      <Canvas
        camera={{ position: [0, 16, 58], fov: 50, far: 2000 }}
        onPointerMissed={() => setSelectedId(null)}
      >
        <color attach="background" args={['#03030a']} />
        <fog attach="fog" args={['#03030a', 40, 180]} />

        <ambientLight intensity={0.3} />
        <pointLight position={[0, 14, 0]} intensity={1.5} />

        <Stars
          radius={200}
          depth={80}
          count={9000}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />

        {Object.entries(galaxyCenters).map(([site, center]) => (
          <GalaxyNebula
            key={`nebula-${site}`}
            center={center}
            color={GALAXY_CORE_COLORS[site] ?? '#ffffff'}
            radius={galaxyRadius * 1.3}
          />
        ))}

        {Object.entries(galaxyCenters).map(([site, center]) => (
          <GalaxyOrbitRings
            key={`rings-${site}`}
            center={center}
            color={GALAXY_CORE_COLORS[site] ?? '#ffffff'}
            galaxyRadius={galaxyRadius}
          />
        ))}

        {Object.entries(galaxyCenters).map(([site, center]) => (
          <GalaxyCore
            key={site}
            center={center}
            color={GALAXY_CORE_COLORS[site] ?? '#ffffff'}
          />
        ))}

        {Object.entries(galaxyCenters).map(([site, center]) => (
          <GalaxyLabel
            key={`label-${site}`}
            center={center}
            site={site}
            count={siteCounts[site] ?? 0}
            color={GALAXY_CORE_COLORS[site] ?? '#ffffff'}
          />
        ))}

        <GalaxyStarfield />

        <Suspense fallback={null}>
          {nodes.map((node) => (
            <ProductNode
              key={node.id}
              node={node}
              isSelected={node.id === selectedId}
              onSelect={(clicked) =>
                setSelectedId((current) =>
                  current === clicked.id ? null : clicked.id
                )
              }
            />
          ))}
        </Suspense>

        <CameraRig selectedNode={selectedNode} />

        <EffectComposer>
          <Bloom
            intensity={1.4}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
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
            <span className={styles.statusSubtext}>{error}</span>
          </div>
        </div>
      )}

      <DetailPanel node={selectedNode} onClose={() => setSelectedId(null)} />
    </div>
  )
}

export default PriceUniverse
