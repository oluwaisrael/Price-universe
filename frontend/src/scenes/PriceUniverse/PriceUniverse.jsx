import { Suspense, useState, useMemo, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
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
import Blackhole from './Blackhole'
import DeepSpaceBackground3D from './DeepSpaceBackground3D'
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
      camera={{ position: [30, 45, 88], fov: 50, far: 2000 }}
      onPointerMissed={() => setSelectedId(null)}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#000008']} />

      {/* ── DEEP SPACE BACKGROUND (GPU, inside R3F) ─────────────── */}
      <DeepSpaceBackground3D />

        {/* Scene lighting */}
        <ambientLight intensity={0.07} />
        <hemisphereLight skyColor="#1a2548" groundColor="#020208" intensity={0.14} />
        {/* Per-galaxy fill — Jumia kept dimmer so hero text stays clear */}
        {Object.entries(galaxyCenters).map(([site, center]) => (
          <pointLight
            key={`fill-${site}`}
            position={[center.x, site === 'Jumia' ? 6 : 8, center.z]}
            color={GALAXY_CORE_COLORS[site]}
            intensity={site === 'Jumia' ? 0.32 : 0.7}
            distance={site === 'Jumia' ? 42 : 55}
            decay={2}
          />
        ))}

        {/* ── BACKGROUND ──────────────────────────────────────────── */}
        <BackgroundPlanets />
        {/* Crack nebulas — fractal rifts of purple/violet gas across bg */}

        {/* Blackhole */}
        <Blackhole position={[-62, 32, -95]} />

        {/* Subtle teal atmosphere on right side (Jiji galaxy side) */}
        <AmbientNebula position={[120, -10, -70]} color="#1a8899" radius={70} opacity={0.14} />
        {/* Bridge haze kept very low so mid-field stays deep black */}
        <AmbientNebula position={[galaxyMid.x, -6, galaxyMid.z - 20]} color="#2a1050" radius={100} opacity={0.09} />
        {/* Far left purple depth (behind text, soft) */}
        <AmbientNebula position={[-40, 10, -90]} color="#3a1870" radius={55} opacity={0.07} />
        {/* Far right deep blue */}
        <AmbientNebula position={[160, -20, -100]} color="#0a4060" radius={60} opacity={0.10} />

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
            opacity={site === 'Jumia' ? 0.48 : 0.72}
          />
        ))}
        {Object.entries(galaxyCenters).map(([site, center]) => (
          <AmbientNebula
            key={`corona-${site}`}
            position={[center.x, 0, center.z]}
            color={GALAXY_CORE_COLORS[site] ?? '#ffffff'}
            radius={galaxyRadius * (site === 'Jumia' ? 1.45 : 1.75)}
            opacity={site === 'Jumia' ? 0.05 : 0.09}
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
            intensity={1.75}
            luminanceThreshold={0.26}
            luminanceSmoothing={0.88}
            mipmapBlur
            radius={1.0}
          />
          <Noise opacity={0.035} />
          <Vignette eskil={false} offset={0.12} darkness={0.68} />
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
