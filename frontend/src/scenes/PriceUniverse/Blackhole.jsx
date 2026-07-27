import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Blackhole — highly realistic black hole based on actual astrophysics.
 *
 * References: M87* (EHT 2019), Sagittarius A* (EHT 2022),
 * Interstellar TARS/GARGANTUA visual.
 *
 * Components:
 *  1. Event horizon — pure black sphere, absorbs all light
 *  2. Photon sphere — ultra-thin bright ring at r=1.5×Schwarzschild,
 *     where light orbits (the "shadow" boundary)
 *  3. Accretion disc — hot gas spiraling inward, brightest on the
 *     approaching (Doppler-boosted) side, dimmer on the receding side
 *  4. Gravitational lensing ring — background stars bent into a ring
 *  5. Inner glow — Hawking/accretion radiation near horizon
 *  6. Relativistic jets — narrow bipolar plasma jets along polar axis
 *  7. Outer corona — very wide, very faint ambient glow
 */

function makeAccretionTex() {
  const size = 2048
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const cx = size / 2, cy = size / 2, cr = size / 2

  // === BASE: black event horizon center ===
  const base = ctx.createRadialGradient(cx, cy, cr*0.08, cx, cy, cr)
  base.addColorStop(0,    'rgba(0,0,0,1)')
  base.addColorStop(0.10, 'rgba(0,0,0,1)')
  // Photon sphere — the innermost bright ring (physically accurate)
  base.addColorStop(0.115,'rgba(255,220,160,1)')
  base.addColorStop(0.13, 'rgba(255,160,60,0.95)')
  // Inner accretion — extremely hot, almost white
  base.addColorStop(0.16, 'rgba(255,200,120,0.88)')
  // Main accretion disc — hot orange
  base.addColorStop(0.22, 'rgba(255,120,20,0.80)')
  base.addColorStop(0.32, 'rgba(200,60,10,0.62)')
  // Outer disc — cools to deep red/purple
  base.addColorStop(0.45, 'rgba(140,20,80,0.40)')
  base.addColorStop(0.58, 'rgba(80,10,100,0.22)')
  base.addColorStop(0.72, 'rgba(40,5,60,0.10)')
  base.addColorStop(0.86, 'rgba(20,0,30,0.04)')
  base.addColorStop(1,    'rgba(0,0,0,0)')

  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  // === DOPPLER BOOSTING: approaching side (left by convention) ===
  // In reality the approaching side of the accretion disc is
  // dramatically brighter (relativistic beaming). Simulate with
  // a radial gradient offset to one side.
  ctx.globalCompositeOperation = 'screen'
  const dopplerGrad = ctx.createRadialGradient(
    cx - cr * 0.18, cy, cr * 0.14,
    cx - cr * 0.18, cy, cr * 0.52
  )
  dopplerGrad.addColorStop(0, 'rgba(255,200,80,0.55)')
  dopplerGrad.addColorStop(0.4,'rgba(255,100,20,0.28)')
  dopplerGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = dopplerGrad
  ctx.fillRect(0, 0, size, size)

  // === TURBULENCE STREAKS: banded accretion structure ===
  let s = 0x1337c0de
  const lcg = () => { s = (s*1664525+1013904223)>>>0; return (s>>>0)/4294967295 }

  for (let i = 0; i < 28; i++) {
    const angle   = lcg() * Math.PI * 2
    const r1      = cr * (0.13 + lcg() * 0.40)
    const r2      = r1 + cr * (0.04 + lcg() * 0.16)
    const sweep   = Math.PI * (0.2 + lcg() * 1.1)
    const bright  = 0.04 + lcg() * 0.22
    const col     = lcg() < 0.6
      ? `rgba(255,${Math.round(80+lcg()*120)},${Math.round(lcg()*40)},${bright})`
      : `rgba(${Math.round(100+lcg()*100)},${Math.round(lcg()*40)},${Math.round(120+lcg()*80)},${bright*0.7})`
    const sg = ctx.createRadialGradient(cx,cy,r1,cx,cy,r2)
    sg.addColorStop(0, col)
    sg.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.arc(cx, cy, r2, angle, angle + sweep)
    ctx.arc(cx, cy, r1, angle + sweep, angle, true)
    ctx.fill()
  }

  ctx.globalCompositeOperation = 'source-over'

  // === INNER GLOW: Hawking radiation / last-light ring ===
  const hawking = ctx.createRadialGradient(cx, cy, cr*0.09, cx, cy, cr*0.16)
  hawking.addColorStop(0, 'rgba(0,0,0,0)')
  hawking.addColorStop(0.4,'rgba(180,220,255,0.35)')
  hawking.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = hawking
  ctx.fillRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function makeLensingTex() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')
  const cx = size / 2

  // Multi-ring lensing pattern — in real BH images there are
  // infinite nested Einstein rings (each exponentially dimmer)
  const rings = [
    { r: 0.165, w: 0.008, a: 0.90 },  // Primary Einstein ring
    { r: 0.145, w: 0.005, a: 0.45 },  // Secondary ring
    { r: 0.132, w: 0.003, a: 0.20 },  // Tertiary ring
  ]

  for (const ring of rings) {
    const grad = ctx.createRadialGradient(cx, cx, cx*(ring.r-ring.w), cx, cx, cx*(ring.r+ring.w))
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(0.5, `rgba(200,220,255,${ring.a})`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
  }

  // Shadow — pure black inside the photon sphere
  const shadow = ctx.createRadialGradient(cx,cx,0,cx,cx,cx*0.13)
  shadow.addColorStop(0, 'rgba(0,0,0,1)')
  shadow.addColorStop(0.85, 'rgba(0,0,0,0.95)')
  shadow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = shadow
  ctx.fillRect(0, 0, size, size)

  // Outer diffuse haze
  const haze = ctx.createRadialGradient(cx,cx,cx*0.18,cx,cx,cx)
  haze.addColorStop(0, 'rgba(60,30,100,0.25)')
  haze.addColorStop(0.4,'rgba(40,10,70,0.12)')
  haze.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = haze
  ctx.fillRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function Blackhole({ position = [-52, 28, -82] }) {
  const discRef  = useRef()
  const disc2Ref = useRef()
  const coronaRef = useRef()

  const accTex     = useMemo(() => makeAccretionTex(), [])
  const lensingTex = useMemo(() => makeLensingTex(), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Accretion disc rotates — inner disc faster (differential rotation)
    if (discRef.current)   discRef.current.rotation.z   =  t * 0.12
    if (disc2Ref.current)  disc2Ref.current.rotation.z  = -t * 0.07
    if (coronaRef.current) {
      coronaRef.current.material.opacity = 0.14 + Math.sin(t * 0.4) * 0.04
    }
  })

  const [px, py, pz] = position
  const tilt = (32 * Math.PI) / 180

  return (
    <group position={[px, py, pz]}>
      {/* ── EVENT HORIZON ── pure black sphere */}
      <mesh>
        <sphereGeometry args={[3.8, 48, 48]} />
        <meshBasicMaterial color="#000000" toneMapped={false} />
      </mesh>

      {/* ── LENSING RING SPRITE ── Einstein rings + shadow */}
      <sprite scale={[22, 22, 1]}>
        <spriteMaterial
          map={lensingTex}
          transparent opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>

      {/* ── ACCRETION DISC ── tilted, rotating */}
      <mesh ref={discRef} rotation={[tilt, 0, 0]}>
        <planeGeometry args={[44, 44]} />
        <meshBasicMaterial
          map={accTex}
          transparent opacity={0.92}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Second disc layer counter-rotating — adds turbulence feel */}
      <mesh ref={disc2Ref} rotation={[tilt + 0.15, 0, 0]}>
        <planeGeometry args={[38, 38]} />
        <meshBasicMaterial
          map={accTex}
          transparent opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── OUTER CORONA ── wide faint purple glow */}
      <sprite ref={coronaRef} scale={[90, 90, 1]}>
        <spriteMaterial
          transparent opacity={0.14}
          color="#330055"
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>

      {/* ── RELATIVISTIC JETS ── bipolar, narrowing with distance */}
      {[1, -1].map((dir, i) => (
        <group key={i} position={[0, dir * 22, 0]} rotation={[dir > 0 ? 0 : Math.PI, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.05, 1.2, 42, 8, 1, true]} />
            <meshBasicMaterial
              color={dir > 0 ? '#aa55ff' : '#6633cc'}
              transparent opacity={0.22}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
          {/* Jet glow core */}
          <mesh>
            <cylinderGeometry args={[0.02, 0.3, 42, 6, 1, true]} />
            <meshBasicMaterial
              color="#ccaaff"
              transparent opacity={0.45}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* ── CORE LIGHTING ── illuminates nearby particles */}
      <pointLight color="#ff8822" intensity={3.5} distance={55} decay={1.8} />
      <pointLight color="#9933ff" intensity={1.8} distance={80} decay={2.0} />
    </group>
  )
}

export default Blackhole
