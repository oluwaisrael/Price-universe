import { Sparkles } from '@react-three/drei'

function GalaxyCore({ center, color }) {
  const position = [center.x, 0, center.z]

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.7, 24, 24]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      
      <mesh>
        <sphereGeometry args={[3.6, 24, 24]} />
        <meshBasicMaterial
          color={color}
          toneMapped={false}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[6, 24, 24]} />
        <meshBasicMaterial
          color={color}
          toneMapped={false}
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>

      <pointLight color={color} intensity={6} distance={44} decay={2} />

      <Sparkles
        count={90}
        scale={[19, 2.5, 19]}
        size={1.8}
        speed={0.15}
        opacity={0.65}
        color={color}
      />
    </group>
  )
}

export default GalaxyCore
