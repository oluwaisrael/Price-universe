import { Suspense, useState, useMemo, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { useProducts } from '../../hooks/useProducts'
import { normalizeProducts } from './normalizeProducts'
import { computeGalaxyLayout, getGalaxyCenters, getGalaxyRadius } from './galaxyLayout'
import ProductNode from './ProductNode'
import GalaxyCore from './GalaxyCore'
import GalaxyDisc from './GalaxyDisc'
import GalaxyStarfield from './GalaxyStarfield'
import GalaxyNebula, { AmbientNebula } from './GalaxyNebula'
import GalaxyLabel from './GalaxyLabel'
import CameraRig from './CameraRig'
import DetailPanel from './DetailPanel'
import styles from './PriceUniverse.module.css'
import BackgroundPlanets from './BackgroundPlanets'
import Blackhole from './Blackhole'
import CrackNebula from './CrackNebula'

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
  const nodes      = useMemo(() => computeGalaxyLayout(normalized), [normalized])
  const galaxyCenters = useMemo(() => getGalaxyCenters(), [])
  const galaxyRadius  = useMemo(() => getGalaxyRadius(), [])
  const siteCounts = useMemo(() => {
    const counts = {}
    for (const node of nodes) counts[node.site] = (counts[node.site] ?? 0) + 1
    return counts
  }, [nodes])
  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const query = searchValue.trim().toLowerCase()
      if (!query) { setSelectedId(null); return }
      const match = nodes.find((n) => n.name.toLowerCase().includes(query))
      setSelectedId(match ? match.id : null)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [searchValue, nodes])

  // Midpoint between both galaxies — used for bridge nebula placement.
  const galaxyMid = useMemo(() => {
    const vals = Object.values(galaxyCenters)
    return { x: (vals[0].x + vals[1].x) / 2, z: (vals[0].z + vals[1].z) / 2 }
  }, [galaxyCenters])

  return (
    <div className={styles.canvasWrapper}>
      <Canvas
        camera={{ position: [30, 20, 88], fov: 50, far: 2000 }}
        onPointerMissed={() => setSelectedId(null)}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#020208']} />

        {/* Scene lighting */}
        <ambientLight intensity={0.12} />
        <hemisphereLight skyColor="#2a3a7f" groundColor="#050310" intensity={0.22} />
        {/* Per-galaxy colored fill lights */}
        {Object.entries(galaxyCenters).map(([site, center]) => (
          <pointLight
            key={`fill-${site}`}
            position={[center.x, 8, center.z]}
            color={GALAXY_CORE_COLORS[site]}
            intensity={0.6}
            distance={55}
            decay={2}
          />
        ))}

        {/* ── BACKGROUND ──────────────────────────────────────────── */}
        <Stars radius={200} depth={80} count={22000} factor={4.8} saturation={0.4} fade speed={0.3} />
        <BackgroundPlanets />

        {/* Crack nebulas — fractal rifts of purple/violet gas across bg */}
        <CrackNebula />

        {/* Blackhole */}
        <Blackhole position={[-52, 28, -82]} />

        {/* Subtle teal atmosphere on right side (Jiji galaxy side) */}
        <AmbientNebula position={[120, -10, -70]} color="#1a8899" radius={65} opacity={0.14} />
        {/* Deep background bridge — very faint, doesn't read as colored,
            just adds the sense of cosmic gas between the two galaxies */}
        <AmbientNebula position={[galaxyMid.x, -6, galaxyMid.z - 20]} color="#220833" radius={95} opacity={0.09} />

        {/* ── PRIMARY GALAXY DISCS ────────────────────────────────────
            Rendered FIRST so everything else (particles, core, cards)
            composites on top. The disc is the dominant visual element
            — particles and glow are enhancements over it, not the
            primary structure. */}
        {Object.entries(galaxyCenters).map(([site, center]) => (
          <GalaxyDisc
            key={`disc-${site}`}
            center={center}
            color={GALAXY_CORE_COLORS[site] ?? '#ffffff'}
            radius={galaxyRadius}
          />
        ))}

        {/* ── PER-GALAXY ATMOSPHERIC HAZE ────────────────────────────
            Two layers per galaxy: inner tight glow (matches the warm/
            cool aura the mockup shows around each disc), outer wide
            corona (gives the galaxy physical weight and extent beyond
            just the visible star field). Kept to 2 layers per galaxy
            (was 8+) so the screen isn't blanketed by overlapping
            sprites that wash out the disc structure. */}
        {Object.entries(galaxyCenters).map(([site, center]) => (
          <GalaxyNebula
            key={`nebula-${site}`}
            center={center}
            color={GALAXY_CORE_COLORS[site] ?? '#ffffff'}
            radius={galaxyRadius * 0.9}
            opacity={0.65}
          />
        ))}
        {Object.entries(galaxyCenters).map(([site, center]) => (
          <AmbientNebula
            key={`corona-${site}`}
            position={[center.x, 0, center.z]}
            color={GALAXY_CORE_COLORS[site] ?? '#ffffff'}
            radius={galaxyRadius * 1.8}
            opacity={0.10}
          />
        ))}

        {/* ── PARTICLE STARFIELD ──────────────────────────────────── */}
        <GalaxyStarfield />

        {/* ── GALAXY LABELS ───────────────────────────────────────── */}
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

        {/* ── GALAXY CORES ────────────────────────────────────────── */}
        {Object.entries(galaxyCenters).map(([site, center]) => (
          <GalaxyCore
            key={`core-${site}`}
            center={center}
            color={GALAXY_CORE_COLORS[site] ?? '#ffffff'}
          />
        ))}

        {/* ── PRODUCT CARDS ───────────────────────────────────────── */}
        <Suspense fallback={null}>
          {nodes.map((node) => (
            <ProductNode
              key={node.id}
              node={node}
              isSelected={node.id === selectedId}
              onSelect={(clicked) =>
                setSelectedId((cur) => (cur === clicked.id ? null : clicked.id))
              }
            />
          ))}
        </Suspense>

        <CameraRig selectedNode={selectedNode} />

        {/* ── POST PROCESSING ─────────────────────────────────────── */}
        <EffectComposer>
          {/* Bloom — threshold tuned so the disc ring bands and core
              bloom but the faint haze layers do not, keeping the disc
              structure visible rather than one uniform glow. */}
          <Bloom
            intensity={1.8}
            luminanceThreshold={0.22}
            luminanceSmoothing={0.88}
            mipmapBlur
            radius={0.88}
          />
          <Noise opacity={0.04} />
          <Vignette eskil={false} offset={0.10} darkness={0.72} />
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
