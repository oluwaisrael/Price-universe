import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 16, 58)
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)
const FOCUS_DISTANCE = 5
const LERP_SPEED = 0.06
const ARRIVE_EPSILON = 0.15

const IDLE_TIMEOUT = 4000
const DRIFT_RADIUS = 58
const DRIFT_HEIGHT = 12
const DRIFT_SPEED = 0.02

function CameraRig({ selectedNode }) {
  const controlsRef = useRef()
  const { camera } = useThree()

  const desiredPosition = useRef(DEFAULT_CAMERA_POSITION.clone())
  const desiredTarget = useRef(DEFAULT_TARGET.clone())

  const isDrifting = useRef(true)
  const idleTimer = useRef(null)
  const driftAngle = useRef(Math.atan2(DEFAULT_CAMERA_POSITION.z, DEFAULT_CAMERA_POSITION.x))

  useEffect(() => {
    if (selectedNode) {
      const [nx, ny, nz] = selectedNode.position
      const nodePos = new THREE.Vector3(nx, ny, nz)
      const offset = new THREE.Vector3(1, 0.6, 1).normalize().multiplyScalar(FOCUS_DISTANCE)

      desiredPosition.current = nodePos.clone().add(offset)
      desiredTarget.current = nodePos.clone()
      isDrifting.current = false
    } else {
      desiredTarget.current = DEFAULT_TARGET.clone()
      if (!isDrifting.current) {
        desiredPosition.current = DEFAULT_CAMERA_POSITION.clone()
      }
    }
  }, [selectedNode?.id])

  const clearIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
  }

  const handleInteractionStart = () => {
    isDrifting.current = false
    clearIdleTimer()
  }

  const handleInteractionEnd = () => {
    clearIdleTimer()
    idleTimer.current = setTimeout(() => {
      if (!selectedNode) isDrifting.current = true
    }, IDLE_TIMEOUT)
  }

  useEffect(() => clearIdleTimer, [])

  useFrame((_, delta) => {
    if (isDrifting.current && !selectedNode) {
      driftAngle.current += DRIFT_SPEED * delta
      desiredPosition.current.set(
        Math.cos(driftAngle.current) * DRIFT_RADIUS,
        DRIFT_HEIGHT,
        Math.sin(driftAngle.current) * DRIFT_RADIUS
      )
      desiredTarget.current.set(0, 0, 0)
    }

    const distanceToGoal = camera.position.distanceTo(desiredPosition.current)
    const programmaticMotion = isDrifting.current || distanceToGoal > ARRIVE_EPSILON

    if (programmaticMotion) {
      if (controlsRef.current) controlsRef.current.enabled = false

      camera.position.lerp(desiredPosition.current, LERP_SPEED)
      camera.lookAt(desiredTarget.current)
    } else {
      
      if (controlsRef.current && !controlsRef.current.enabled) {
        controlsRef.current.target.copy(desiredTarget.current)
        controlsRef.current.update()
        controlsRef.current.enabled = true
      }
      if (controlsRef.current) {
        controlsRef.current.target.lerp(desiredTarget.current, LERP_SPEED)
        controlsRef.current.update()
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={160}
      onStart={handleInteractionStart}
      onEnd={handleInteractionEnd}
    />
  )
}

export default CameraRig
