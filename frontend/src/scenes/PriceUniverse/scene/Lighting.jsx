/** Phase 1 lighting — soft gradient feel, no galaxy lights */
export default function Lighting() {
  return (
    <>
      <ambientLight intensity={0.06} />
      <hemisphereLight skyColor="#1a2040" groundColor="#06040c" intensity={0.12} />
      {/* Subtle directional wash from upper-left (hero side) */}
      <directionalLight position={[-40, 60, 20]} intensity={0.04} color="#c8b0ff" />
      <directionalLight position={[50, 30, 10]} intensity={0.03} color="#80c0e0" />
    </>
  )
}
