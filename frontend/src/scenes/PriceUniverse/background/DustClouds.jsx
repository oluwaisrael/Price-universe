import { useMemo } from 'react'
import * as THREE from 'three'
import { hash01 } from '../utils/noise'

/** Soft wispy dust — almost invisible atmosphere, not particle soup */
export default function DustClouds() {
  const map = useMemo(() => {
    const s = 64
    const c = document.createElement('canvas')
    c.width = c.height = s
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
    g.addColorStop(0, 'rgba(255,255,255,0.5)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.08)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
    const t = new THREE.CanvasTexture(c)
    t.needsUpdate = true
    return t
  }, [])

  const { pos, col, count } = useMemo(() => {
    const n = 6000
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const cx = 40, cy = 5, cz = -40
    for (let i = 0; i < n; i++) {
      const R = 80 + hash01(i, 1) * 200
      const th = hash01(i, 2) * Math.PI * 2
      const ph = (hash01(i, 3) - 0.5) * Math.PI
      pos[i*3] = cx + Math.cos(th) * Math.cos(ph) * R
      pos[i*3+1] = cy + Math.sin(ph) * R * 0.5
      pos[i*3+2] = cz + Math.sin(th) * Math.cos(ph) * R
      const pick = hash01(i, 4)
      if (pick < 0.45) { col[i*3]=0.25; col[i*3+1]=0.16; col[i*3+2]=0.38 }
      else if (pick < 0.8) { col[i*3]=0.1; col[i*3+1]=0.2; col[i*3+2]=0.32 }
      else { col[i*3]=0.28; col[i*3+1]=0.18; col[i*3+2]=0.12 }
    }
    return { pos, col, count: n }
  }, [])

  return (
    <points frustumCulled={false} renderOrder={-72}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={pos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.9}
        vertexColors
        map={map}
        alphaMap={map}
        transparent
        opacity={0.12}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}
