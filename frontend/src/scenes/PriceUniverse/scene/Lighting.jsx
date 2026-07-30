/** Stage 1 lighting — quiet, no galaxy lights */
export default function Lighting() {
  return (
    <>
      <ambientLight intensity={0.08} />
      <hemisphereLight skyColor="#12182a" groundColor="#020208" intensity={0.12} />
    </>
  )
}
