import { useMemo } from 'react'
import * as THREE from 'three'

function hash(i, s) {
  let h = Math.imul(i ^ (s * 0x9e3779b9), 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

/** Fine colored cosmic dust — independent of galaxies */
export default function Dust() {
  const { pos, col, count } = useMemo(() => {
    const n = 6000
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      pos[i*3] = (hash(i,1)-0.5)*200
      pos[i*3+1] = (hash(i,2)-0.5)*120
      pos[i*3+2] = -220 + hash(i,3)*140
      const pick = hash(i,4)
      if (pick < 0.33) { col[i*3]=0.35; col[i*3+1]=0.2; col[i*3+2]=0.45 }
      else if (pick < 0.66) { col[i*3]=0.15; col[i*3+1]=0.3; col[i*3+2]=0.4 }
      else { col[i*3]=0.4; col[i*3+1]=0.25; col[i*3+2]=0.15 }
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
        size={0.4} vertexColors transparent opacity={0.22}
        sizeAttenuation depthWrite={false}
        blending={THREE.AdditiveBlending} toneMapped={false}
      />
    </points>
  )
}
