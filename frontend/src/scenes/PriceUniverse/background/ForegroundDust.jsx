import { useMemo } from 'react'
import * as THREE from 'three'
import { hash01 } from '../utils/noise'

/** Sparse nearer dust — depth cue only */
export default function ForegroundDust() {
  const map = useMemo(() => {
    const s = 32
    const c = document.createElement('canvas')
    c.width = c.height = s
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
    g.addColorStop(0, 'rgba(255,255,255,0.6)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
    const t = new THREE.CanvasTexture(c)
    t.needsUpdate = true
    return t
  }, [])

  const { pos, col, count } = useMemo(() => {
    const n = 800
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      pos[i*3] = 40 + (hash01(i,1)-0.5)*100
      pos[i*3+1] = 5 + (hash01(i,2)-0.5)*50
      pos[i*3+2] = -30 + hash01(i,3)*40
      const v = 0.25 + hash01(i,4)*0.3
      col[i*3]=v*0.9; col[i*3+1]=v*0.95; col[i*3+2]=v
    }
    return { pos, col, count: n }
  }, [])

  return (
    <points frustumCulled={false} renderOrder={-20}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={pos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.6}
        vertexColors
        map={map}
        alphaMap={map}
        transparent
        opacity={0.2}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}
