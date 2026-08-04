import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Layered sky sphere — organic nebula with pockets, streaks, holes.
 * Purple / blue / teal / warm spill near galaxy. Not a flat wash.
 */
export default function NebulaLayer({ galaxyPos = [48, 0, -12] }) {
  const uniforms = useMemo(
    () => ({
      uGalaxyPos: { value: new THREE.Vector3(...galaxyPos) },
    }),
    [galaxyPos[0], galaxyPos[1], galaxyPos[2]],
  )

  return (
    <mesh renderOrder={-95}>
      <sphereGeometry args={[400, 64, 40]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
        transparent
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vWorld;
          varying vec3 vDir;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorld = wp.xyz;
            vDir = normalize(position);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `}
        fragmentShader={`
          varying vec3 vWorld;
          varying vec3 vDir;
          uniform vec3 uGalaxyPos;

          float hash(vec3 p) {
            p = fract(p * vec3(443.897, 397.297, 491.187));
            p += dot(p, p.yxz + 19.19);
            return fract((p.x + p.y) * p.z);
          }
          float noise(vec3 p) {
            vec3 i = floor(p), f = fract(p);
            f = f*f*(3.0-2.0*f);
            return mix(
              mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
                  mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
              mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                  mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
          }
          float fbm(vec3 p) {
            float v=0.0, a=0.5;
            for(int i=0;i<6;i++){ v+=a*noise(p); p=p*2.1+vec3(1.7,9.2,3.3); a*=0.5; }
            return v;
          }

          void main() {
            vec3 d = normalize(vDir);

            // Multi-scale structure — pockets & holes
            float nLarge = fbm(d * 1.4);
            float nMid   = fbm(d * 3.2 + 7.0);
            float nFine  = fbm(d * 7.0 + 19.0);
            float nStreak = fbm(d * vec3(0.8, 3.5, 0.8) + 3.0); // elongated

            // Cloud mask with holes (not solid fill)
            float clouds = smoothstep(0.42, 0.72, nLarge);
            clouds *= smoothstep(0.35, 0.7, nMid);
            // Punch holes
            float holes = smoothstep(0.55, 0.75, nFine);
            clouds *= (1.0 - holes * 0.65);
            // Streak / river structures
            float rivers = smoothstep(0.5, 0.8, nStreak) * 0.5;

            float density = clamp(clouds * 0.68 + rivers * 0.42, 0.0, 1.0);
            density = pow(density, 1.15); // richer structure, still mostly dark

            // Color regions
            float side = d.x * 0.5 + 0.5;
            float up = d.y * 0.5 + 0.5;
            vec3 purple = vec3(0.18, 0.05, 0.3);
            vec3 blue   = vec3(0.02, 0.06, 0.14);
            vec3 teal   = vec3(0.01, 0.1, 0.14);
            vec3 col = mix(purple, blue, smoothstep(0.2, 0.7, side));
            col = mix(col, teal, smoothstep(0.55, 0.95, side) * (1.0 - up * 0.4));

            // Dark dust lanes cutting through
            float lanes = smoothstep(0.45, 0.55, nMid) * smoothstep(0.6, 0.5, nFine);
            col *= 1.0 - lanes * 0.5;

            // Warm spill from Jumia galaxy direction
            vec3 toGal = normalize(uGalaxyPos);
            float warm = pow(max(0.0, dot(d, toGal)), 4.0);
            col = mix(col, vec3(0.2, 0.08, 0.02), warm * 0.35 * density);

            // Near-black void (match mockup)
            vec3 voidCol = vec3(0.0, 0.0, 0.002);
            float amp = density * 0.34;
            vec3 finalCol = mix(voidCol, col, amp);

            // Soft atmospheric gradient (barely there)
            finalCol += vec3(0.003, 0.003, 0.008) * (0.08 + 0.05 * up);

            gl_FragColor = vec4(finalCol, 1.0);
          }
        `}
      />
    </mesh>
  )
}
