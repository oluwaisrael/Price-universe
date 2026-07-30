import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Galaxy — multi-layer cinematic unit (one marketplace).
 *
 * Layers (back → front):
 *  1. Ambient volume haze (soft additive sprites)
 *  2. Dense dim arm dust (the body — hides "individual particles")
 *  3. Brighter arm sparkle (sparse highlights)
 *  4. Hot stellar core (white → color falloff)
 *  5. Inner core spark
 *
 * Arms = luminous dusty rivers (volume + density), not lines or solid tubes.
 */

const ARM_COUNT = 2
const SPIRAL_TURNS = 1.1

function hash01(i, salt = 0) {
  let h = Math.imul(i ^ (salt * 0x9e3779b9), 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}

function gauss(i, salt) {
  const u1 = Math.max(hash01(i, salt), 1e-6)
  const u2 = hash01(i, salt + 1)
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2)
}

function makeRadialTex(inner = 1) {
  const s = 256
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, `rgba(255,255,255,${inner})`)
  g.addColorStop(0.2, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

function makeSoftPointTex() {
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

/** Sample log-spiral arm with Gaussian volume offset */
function sampleArm(arm, t, R, thick, seed) {
  const r0 = R * 0.05
  const k = (SPIRAL_TURNS * Math.PI * 2) / Math.log(R / r0)
  const armOff = (arm / ARM_COUNT) * Math.PI * 2
  const radius = r0 + Math.pow(Math.max(t, 0.001), 0.8) * (R - r0)
  const theta = armOff + k * Math.log(radius / r0)
  // Thickness grows outward — broad outer ribbons
  const sigma = thick * (0.55 + 0.9 * t)
  const d = gauss(seed, arm) * sigma
  const x = Math.cos(theta) * radius + Math.cos(theta + Math.PI / 2) * d
  const z = Math.sin(theta) * radius + Math.sin(theta + Math.PI / 2) * d
  const y = gauss(seed, arm + 17) * sigma * 0.35
  return [x, y, z, theta, t]
}

function buildArmParticles(R, color, count, thick, brightness) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const col = new THREE.Color(color)
  let w = 0
  for (let i = 0; i < count; i++) {
    const arm = i % ARM_COUNT
    const t = Math.pow(hash01(i, 3), 0.7)
    if (t < 0.04) continue // core owned by sprites
    // Soft gaps
    if (Math.sin(t * 12 + arm * 4) > 0.88 && hash01(i, 9) < 0.4) continue
    const [x, y, z] = sampleArm(arm, t, R, thick, i)
    positions[w * 3] = x
    positions[w * 3 + 1] = y
    positions[w * 3 + 2] = z
    // Dimmer toward rim; brighter mid-arm
    const bulge = Math.sin(t * Math.PI) * 0.45 + 0.55
    const v = brightness * bulge * (0.5 + hash01(i, 5) * 0.5)
    colors[w * 3] = col.r * v
    colors[w * 3 + 1] = col.g * v
    colors[w * 3 + 2] = col.b * v
    w++
  }
  return {
    positions: positions.subarray(0, w * 3),
    colors: colors.subarray(0, w * 3),
    count: w,
  }
}

function PointsLayer({ data, size, opacity, map, renderOrder = 0 }) {
  if (!data || data.count === 0) return null
  return (
    <points frustumCulled={false} renderOrder={renderOrder}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={data.count} array={data.positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={data.count} array={data.colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        vertexColors
        map={map}
        alphaMap={map}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

export default function Galaxy({
  center,
  color = '#ff9a3c',
  radius = 40,
  dustCount = 28000,
  sparkleCount = 4000,
  rotateSpeed = 0.015,
}) {
  const group = useRef()
  const coreRef = useRef()
  const pointTex = useMemo(() => makeSoftPointTex(), [])
  const coreTex = useMemo(() => makeRadialTex(1), [])
  const col = useMemo(() => new THREE.Color(color), [color])

  const dust = useMemo(
    () => buildArmParticles(radius, color, dustCount, radius * 0.14, 0.55),
    [radius, color, dustCount],
  )
  const sparkle = useMemo(
    () => buildArmParticles(radius, color, sparkleCount, radius * 0.08, 1.1),
    [radius, color, sparkleCount],
  )

  // Volume haze sprites along arms (soft rivers under particles)
  const hazeSprites = useMemo(() => {
    const list = []
    const n = 36
    for (let arm = 0; arm < ARM_COUNT; arm++) {
      for (let i = 0; i < n; i++) {
        const t = 0.08 + (i / (n - 1)) * 0.9
        const [x, y, z] = sampleArm(arm, t, radius, radius * 0.05, 1000 + arm * n + i)
        const s = radius * (0.28 + 0.35 * t)
        list.push({
          key: `h-${arm}-${i}`,
          position: [x, y * 0.3, z],
          scale: s,
          opacity: 0.07 + 0.06 * Math.sin(t * Math.PI),
        })
      }
    }
    return list
  }, [radius])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (group.current) group.current.rotation.y = t * rotateSpeed
    if (coreRef.current) {
      const b = 1 + Math.sin(t * 0.7) * 0.04
      coreRef.current.scale.setScalar(b)
    }
  })

  const coreR = radius * 0.16
  const midR = radius * 0.32
  const outerR = radius * 0.55

  return (
    <group ref={group} position={[center.x, center.y ?? 0, center.z]}>
      {/* 1. Soft volume haze along arms */}
      {hazeSprites.map((h) => (
        <mesh key={h.key} position={h.position} renderOrder={-12}>
          <planeGeometry args={[h.scale, h.scale]} />
          <meshBasicMaterial
            map={coreTex}
            color={col}
            transparent
            opacity={h.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* 2. Dense dim dust — the galaxy body */}
      <PointsLayer data={dust} size={0.55} opacity={0.45} map={pointTex} renderOrder={-10} />

      {/* 3. Sparse brighter sparkles */}
      <PointsLayer data={sparkle} size={0.85} opacity={0.7} map={pointTex} renderOrder={-9} />

      {/* 4–5. Hot stellar core */}
      <group ref={coreRef}>
        <mesh rotation={[-0.5, 0, 0]} renderOrder={-6}>
          <planeGeometry args={[outerR * 2, outerR * 2]} />
          <meshBasicMaterial
            map={coreTex}
            color={col}
            transparent
            opacity={0.25}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[-0.5, 0, 0]} renderOrder={-5}>
          <planeGeometry args={[midR * 2, midR * 2]} />
          <meshBasicMaterial
            map={coreTex}
            color={col}
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[-0.5, 0, 0]} renderOrder={-4}>
          <planeGeometry args={[coreR * 2, coreR * 2]} />
          <meshBasicMaterial
            map={coreTex}
            color="#ffffff"
            transparent
            opacity={1}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <pointLight color={color} intensity={1.2} distance={radius * 1.5} decay={2} />
      </group>
    </group>
  )
}
