import { useMemo } from 'react'
import * as THREE from 'three'
import { generateFillerStars, generateCoreDust, getGalaxyCenters } from './galaxyLayout'

/**
 * Layered cinematic starfield — art-directed, not scientific.
 *
 * Layers (back → front visual weight):
 *  1. Halo       — dissolves galaxy into space
 *  2. Inter-arm  — sparse fill, preserves gaps
 *  3. Cloud      — bulk arm mass (silhouette)
 *  4. Ridge      — bright arm spine
 *  5. Core dust  — dense nucleus
 *
 * Single BufferGeometry per layer. Additive soft points.
 * Color: warm for Jumia, cool for Jiji.
 */

const SITE_COLORS = {
  Jumia: new THREE.Color('#ff9a3c'),
  Jiji: new THREE.Color('#2ee6ff'),
}

function makeSoftDiscTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.7)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.2)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function buildBuffers(points, colorMul = 1) {
  const n = points.length
  const positions = new Float32Array(n * 3)
  const colors = new Float32Array(n * 3)
  const sizes = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    const p = points[i]
    positions[i * 3] = p.position[0]
    positions[i * 3 + 1] = p.position[1]
    positions[i * 3 + 2] = p.position[2]

    const base = SITE_COLORS[p.site] ?? new THREE.Color('#ffffff')
    // Slight per-point brightness variation for life
    const v = 0.75 + (Math.sin(i * 12.9898) * 0.5 + 0.5) * 0.35
    colors[i * 3] = base.r * colorMul * v
    colors[i * 3 + 1] = base.g * colorMul * v
    colors[i * 3 + 2] = base.b * colorMul * v
    sizes[i] = p.scale ?? 0.3
  }

  return { positions, colors, sizes, count: n }
}

function PointsLayer({ buffers, size, opacity }) {
  if (!buffers || buffers.count === 0) return null
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={buffers.count}
          array={buffers.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={buffers.count}
          array={buffers.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        vertexColors
        map={undefined}
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

export default function GalaxyStarfield() {
  const softTexture = useMemo(() => makeSoftDiscTexture(), [])

  const layers = useMemo(() => {
    const stars = generateFillerStars()
    const core = generateCoreDust()

    const ridge = stars.filter((s) => s.kind === 'ridge')
    const cloud = stars.filter((s) => s.kind === 'cloud')
    const inter = stars.filter((s) => s.kind === 'interarm')
    const halo = stars.filter((s) => s.kind === 'halo')

    return {
      halo: buildBuffers(halo, 0.55),
      inter: buildBuffers(inter, 0.45),
      cloud: buildBuffers(cloud, 0.85),
      ridge: buildBuffers(ridge, 1.15),
      core: buildBuffers(core, 1.35),
      total: stars.length + core.length,
    }
  }, [])

  // Soft texture shared via pointsMaterial map
  const tex = softTexture

  return (
    <group>
      {/* Halo — softest, largest points */}
      <points frustumCulled={false} renderOrder={-20}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={layers.halo.count} array={layers.halo.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={layers.halo.count} array={layers.halo.colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={2.2}
          vertexColors
          map={tex}
          alphaMap={tex}
          transparent
          opacity={0.22}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      {/* Inter-arm — preserves gaps */}
      <points frustumCulled={false} renderOrder={-15}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={layers.inter.count} array={layers.inter.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={layers.inter.count} array={layers.inter.colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={0.9}
          vertexColors
          map={tex}
          alphaMap={tex}
          transparent
          opacity={0.28}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      {/* Arm cloud — bulk silhouette */}
      <points frustumCulled={false} renderOrder={-10}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={layers.cloud.count} array={layers.cloud.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={layers.cloud.count} array={layers.cloud.colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={0.7}
          vertexColors
          map={tex}
          alphaMap={tex}
          transparent
          opacity={0.35}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      {/* Arm ridge — bright spine */}
      <points frustumCulled={false} renderOrder={-5}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={layers.ridge.count} array={layers.ridge.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={layers.ridge.count} array={layers.ridge.colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={0.55}
          vertexColors
          map={tex}
          alphaMap={tex}
          transparent
          opacity={0.5}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      {/* Core dust */}
      <points frustumCulled={false} renderOrder={0}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={layers.core.count} array={layers.core.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={layers.core.count} array={layers.core.colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={1.8}
          vertexColors
          map={tex}
          alphaMap={tex}
          transparent
          opacity={0.92}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  )
}
