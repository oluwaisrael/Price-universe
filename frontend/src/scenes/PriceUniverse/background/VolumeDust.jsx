import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { hash01 } from '../utils/noise'

/**
 * Volume dust — soft smoke-like billows, not sparkly particles.
 * Mid-depth, colored by region (purple / blue / warm near galaxy).
 */
export default function VolumeDust({ galaxyPos = [48, 0, -12] }) {
  const ref = useRef()
  const map = useMemo(() => {
    const s = 64
    const c = document.createElement('canvas')
    c.width = c.height = s
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
    g.addColorStop(0, 'rgba(255,255,255,0.45)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.12)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
    const t = new THREE.CanvasTexture(c)
    t.needsUpdate = true
    return t
  }, [])

  const { pos, col, count } = useMemo(() => {
    const n = 9000
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const [gx, gy, gz] = galaxyPos
    for (let i = 0; i < n; i++) {
      // Prefer mid-depth shell, uneven clusters
      const cluster = Math.floor(hash01(i, 0) * 6)
      const cx = (hash01(cluster, 10) - 0.5) * 180
      const cy = (hash01(cluster, 11) - 0.5) * 90
      const cz = -200 + hash01(cluster, 12) * 120
      pos[i*3] = cx + (hash01(i,1)-0.5) * 70
      pos[i*3+1] = cy + (hash01(i,2)-0.5) * 40
      pos[i*3+2] = cz + (hash01(i,3)-0.5) * 50

      // Color by position + warm near galaxy
      const dx = pos[i*3] - gx
      const dz = pos[i*3+2] - gz
      const distG = Math.sqrt(dx*dx + dz*dz)
      const nearG = Math.max(0, 1 - distG / 100)
      const side = pos[i*3] < 0
      if (nearG > 0.4) {
        col[i*3]=0.45; col[i*3+1]=0.22; col[i*3+2]=0.08
      } else if (side) {
        col[i*3]=0.28; col[i*3+1]=0.12; col[i*3+2]=0.4
      } else {
        col[i*3]=0.08; col[i*3+1]=0.22; col[i*3+2]=0.35
      }
    }
    return { pos, col, count: n }
  }, [galaxyPos[0], galaxyPos[1], galaxyPos[2]])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.x = Math.sin(t * 0.012) * 3
    ref.current.position.y = Math.cos(t * 0.01) * 2
  })

  return (
    <points ref={ref} frustumCulled={false} renderOrder={-60}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={pos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={3.2}
        vertexColors
        map={map}
        alphaMap={map}
        transparent
        opacity={0.09}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}
