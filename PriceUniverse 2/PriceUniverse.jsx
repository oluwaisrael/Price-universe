import { Suspense, useState, useMemo, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { useProducts } from '../../hooks/useProducts'
import { normalizeProducts } from './normalizeProducts'
import { computeGalaxyLayout, getGalaxyCenters, getGalaxyRadius } from './galaxyLayout'
import ProductNode from './ProductNode'
import GalaxyCore from './GalaxyCore'
import GalaxyStarfield from './GalaxyStarfield'
import GalaxyNebula, { AmbientNebula } from './GalaxyNebula'
// GalaxyOrbitRings import removed — component no longer used, see
// note near its former render call.
import GalaxyOrbitSatellites from './GalaxyOrbitSatellites'
import GalaxyLabel from './GalaxyLabel'
import CameraRig from './CameraRig'
import DetailPanel from './DetailPanel'
import styles from './PriceUniverse.module.css'
import BackgroundPlanets from './BackgroundPlanets'

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
        camera={{ position: [30, 20, 88], fov: 50, far: 2000 }}
        onPointerMissed={() => setSelectedId(null)}
      >
        <color attach="background" args={['#03030a']} />
        {/* Fog range tightened slightly (46->42 near, 200->170 far) —
            atmosphere pass wants a stronger, faster falloff into haze
            so depth reads more dramatically, rather than distant
            elements staying almost fully visible out to 200 units. */}
        <fog attach="fog" args={['#03030a', 42, 170]} />

        <ambientLight intensity={0.3} />
        <hemisphereLight
          skyColor="#3a4a8f"
          groundColor="#0a0510"
          intensity={0.35}
        />
        <pointLight position={[0, 14, 0]} intensity={1.5} />
        <pointLight position={[-30, 8, 20]} intensity={0.4} color="#8899ff" />

        <Stars
          radius={160}
          depth={70}
          count={13000}
          factor={5}
          saturation={0}
          fade
          speed={0.5}
        />
        <BackgroundPlanets />

        {/* Ambient haze in open space, unrelated to either galaxy —
            matches the mockup's soft violet cloud behind the hero
            text. Positioned left/back of the camera target so it
            doesn't wash out the galaxies themselves. */}
        <AmbientNebula position={[-30, 10, -30]} color="#6a4fd9" radius={68} opacity={0.26} />
        <AmbientNebula position={[130, -20, -80]} color="#2dd4bf" radius={60} opacity={0.14} />
        
         {Object.entries(galaxyCenters).map(([site, center]) => (
          <GalaxyNebula
            key={`nebula-${site}`}
            center={center}
            color={GALAXY_CORE_COLORS[site] ?? '#ffffff'}
            radius={galaxyRadius * 0.65}
          />
        ))}

        {/* GalaxyOrbitRings removed — the reference has no visible
            orbit paths of any kind (neither circles nor spiral
            curves). The spiral shape now comes purely from dense
            particle dust density in GalaxyStarfield, which reads as
            a continuous luminous band rather than an explicit line. */}

        {Object.entries(galaxyCenters).map(([site, center]) => (
          <GalaxyOrbitSatellites
            key={`satellites-${site}`}
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
            galaxyRadius={galaxyRadius}
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
          {/* Bloom softened: intensity 1.4->1.0, threshold 0.15->0.35.
              Previously nearly everything in-scene contributed some
              bloom, reading as a uniform soft-focus haze rather than
              distinct bright things glowing. Raising the threshold
              means only genuinely bright elements (cores, hovered
              cards, orbit rings) bloom now, which is what makes bloom
              read as "cinematic glow" instead of "everything is
              blurry." */}
          <Bloom
            intensity={0.55}
            luminanceThreshold={0.35}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.15} darkness={0.6} />
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