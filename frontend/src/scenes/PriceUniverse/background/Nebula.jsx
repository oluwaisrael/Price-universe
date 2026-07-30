import { useMemo } from 'react'
import * as THREE from 'three'

function makeSoft() {
  const s = 256
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  for (let i = 0; i < 6; i++) {
    const cx = s * (0.25 + Math.random() * 0.5)
    const cy = s * (0.25 + Math.random() * 0.5)
    const r = s * (0.2 + Math.random() * 0.4)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, 'rgba(255,255,255,0.4)')
    g.addColorStop(0.45, 'rgba(255,255,255,0.1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  }
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

/** Soft painted nebula plates — cheat with sprites, not math spirals */
export default function Nebula() {
  const map = useMemo(() => makeSoft(), [])
  const plates = useMemo(() => [
    { p: [-50, 20, -125], c: '#4a2280', s: 115, o: 0.13 },
    { p: [-25, -12, -145], c: '#2a1455', s: 95, o: 0.09 },
    { p: [55, 14, -135], c: '#0a5575', s: 105, o: 0.11 },
    { p: [75, -18, -155], c: '#0a4065', s: 88, o: 0.08 },
    { p: [8, 4, -165], c: '#301850', s: 125, o: 0.07 },
    { p: [-65, 28, -105], c: '#5a3025', s: 72, o: 0.05 },
  ], [])

  return (
    <group>
      {plates.map((n, i) => (
        <mesh key={i} position={n.p} renderOrder={-90}>
          <planeGeometry args={[n.s, n.s * 0.72]} />
          <meshBasicMaterial
            map={map} color={n.c} transparent opacity={n.o}
            depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}
          />
        </mesh>
      ))}
      {/* Soft color bridge fog */}
      <mesh position={[0, 0, -200]} renderOrder={-88}>
        <planeGeometry args={[420, 290]} />
        <shaderMaterial
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending} toneMapped={false}
          vertexShader={`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
          fragmentShader={`
            varying vec2 vUv;
            void main(){
              vec3 a=vec3(0.05,0.018,0.0);
              vec3 b=vec3(0.035,0.01,0.06);
              vec3 c=vec3(0.0,0.022,0.05);
              vec3 col=mix(a,b,smoothstep(0.12,0.5,vUv.x));
              col=mix(col,c,smoothstep(0.45,0.88,vUv.x));
              float vig=1.0-smoothstep(0.2,0.95,length(vUv-0.5));
              gl_FragColor=vec4(col,0.2*vig);
            }
          `}
        />
      </mesh>
    </group>
  )
}
