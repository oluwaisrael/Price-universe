import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { hash01 } from '../utils/noise'

/** Volumetric-feeling dust — soft, uneven, almost invisible */
export default function DustClouds() {
  const ref = useRef()
  const map = useMemo(() => {
    const s = 64
    const c = document.createElement('canvas')
    c.width = c.height = s
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,0.55)')
    g.addColorStop(0.45, 'rgba(255,255,255,0.1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
    const t = new THREE.CanvasTexture(c)
    t.needsUpdate = true
    return t
  }, [])

  const { pos, col, count } = useMemo(() => {
    const n = 14000
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (hash01(i, 1) - 0.5) * 280
      pos[i * 3 + 1] = (hash01(i, 2) - 0.5) * 160
      pos[i * 3 + 2] = -280 + hash01(i, 3) * 200
      const pick = hash01(i, 4)
      if (pick < 0.4) {
        col[i * 3] = 0.35; col[i * 3 + 1] = 0.2; col[i * 3 + 2] = 0.55
      } else if (pick < 0.75) {
        col[i * 3] = 0.12; col[i * 3 + 1] = 0.28; col[i * 3 + 2] = 0.45
      } else {
        col[i * 3] = 0.4; col[i * 3 + 1] = 0.26; col[i * 3 + 2] = 0.15
      }
    }
    return { pos, col, count: n }
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.x = Math.sin(t * 0.018) * 2.5
    ref.current.position.y = Math.cos(t * 0.014) * 1.5
  })

  return (
    <points ref={ref} frustumCulled={false} renderOrder={-72}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={pos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={1.1}
        vertexColors
        map={map}
        alphaMap={map}
        transparent
        opacity={0.22}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}
