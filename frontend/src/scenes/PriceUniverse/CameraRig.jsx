import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { getProductWorldPos } from './productRegistry'

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(70, 28, 125)
const DEFAULT_TARGET = new THREE.Vector3(150, -5, -16)
const FOCUS_DISTANCE = 9
const LERP_SPEED = 0.12
const ARRIVE_EPSILON = 0.08

/**
 * Stable camera: no idle drift, no breath pulse.
 * Only moves when a product is selected (search / click).
 */
function CameraRig({ selectedNode }) {
  const controlsRef = useRef()
  const { camera } = useThree()
  const desiredPosition = useRef(DEFAULT_CAMERA_POSITION.clone())
  const desiredTarget = useRef(DEFAULT_TARGET.clone())
  const focusing = useRef(false)
  const initialized = useRef(false)

  // Snap to default once on mount
  useEffect(() => {
    if (!initialized.current) {
      camera.position.copy(DEFAULT_CAMERA_POSITION)
      camera.lookAt(DEFAULT_TARGET)
      initialized.current = true
    }
  }, [camera])

  useEffect(() => {
    if (selectedNode) {
      const live = getProductWorldPos(selectedNode.id)
      const [nx, ny, nz] = selectedNode.position
      const nodePos = live
        ? new THREE.Vector3(live.x, live.y, live.z)
        : new THREE.Vector3(nx, ny, nz)
      const offset = new THREE.Vector3(1.2, 0.7, 1.1).normalize().multiplyScalar(FOCUS_DISTANCE)
      desiredPosition.current = nodePos.clone().add(offset)
      desiredTarget.current = nodePos.clone()
      focusing.current = true
    } else {
      desiredPosition.current = DEFAULT_CAMERA_POSITION.clone()
      desiredTarget.current = DEFAULT_TARGET.clone()
      focusing.current = true // lerp home, then stop
    }
  }, [selectedNode?.id])

  useFrame(() => {
    // Track selected product as galaxy spins
    if (selectedNode) {
      const live = getProductWorldPos(selectedNode.id)
      if (live) {
        const nodePos = new THREE.Vector3(live.x, live.y, live.z)
        const offset = new THREE.Vector3(1.2, 0.7, 1.1).normalize().multiplyScalar(FOCUS_DISTANCE)
        desiredTarget.current.copy(nodePos)
        desiredPosition.current.copy(nodePos).add(offset)
        focusing.current = true
      }
    }

    const distanceToGoal = camera.position.distanceTo(desiredPosition.current)

    if (focusing.current && distanceToGoal > ARRIVE_EPSILON) {
      if (controlsRef.current) controlsRef.current.enabled = false
      camera.position.lerp(desiredPosition.current, LERP_SPEED)
      camera.lookAt(desiredTarget.current)
    } else {
      // Arrived — fully stop. No breath, no drift, no micro-lerp.
      focusing.current = false
      if (controlsRef.current) {
        if (!controlsRef.current.enabled) {
          controlsRef.current.target.copy(desiredTarget.current)
          controlsRef.current.update()
          controlsRef.current.enabled = true
        }
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.05}
      minDistance={40}
      maxDistance={220}
      maxPolarAngle={Math.PI * 0.48}
      target={DEFAULT_TARGET}
    />
  )
}

export default CameraRig
