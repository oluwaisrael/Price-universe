import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Pulled back and raised from the original (24,14,72)/(38,2,-14) pair —
// at that distance the orbit rings (radius up to ~15) filled most of
// the frame edge-to-edge, reading as solid arcs instead of the thin
// distant threads in the reference mockup. Backing off to a wider,
// higher vantage lets both galaxies (centers at x:14/z:-6 and
// x:68/z:-24, radius 18 each) sit fully inside frame with breathing
// room, matching the "both galaxies visible, generous margin" framing
// of the reference image.
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(30, 20, 92)
const DEFAULT_TARGET = new THREE.Vector3(41, 1, -15)
const FOCUS_DISTANCE = 5
const LERP_SPEED = 0.06
const ARRIVE_EPSILON = 0.15

const IDLE_TIMEOUT = 4000
const DRIFT_RADIUS = 46
const DRIFT_HEIGHT = 18
const DRIFT_SPEED = 0.018

const BREATH_HEIGHT_AMPLITUDE = 1.1
const BREATH_HEIGHT_SPEED = 0.35
const BREATH_RADIUS_AMPLITUDE = 1.6
const BREATH_RADIUS_SPEED = 0.22

function CameraRig({ selectedNode }) {
  const controlsRef = useRef()
  const { camera } = useThree()

  const desiredPosition = useRef(DEFAULT_CAMERA_POSITION.clone())
  const desiredTarget = useRef(DEFAULT_TARGET.clone())

  const isDrifting = useRef(true)
  const idleTimer = useRef(null)
  const driftAngle = useRef(
    Math.atan2(
      DEFAULT_CAMERA_POSITION.z - DEFAULT_TARGET.z,
      DEFAULT_CAMERA_POSITION.x - DEFAULT_TARGET.x
    )
  )

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

  useFrame((state, delta) => {
    if (isDrifting.current && !selectedNode) {
      driftAngle.current += DRIFT_SPEED * delta

      const t = state.clock.elapsedTime
      const breathHeight = Math.sin(t * BREATH_HEIGHT_SPEED) * BREATH_HEIGHT_AMPLITUDE
      const breathRadius = Math.sin(t * BREATH_RADIUS_SPEED + 1.3) * BREATH_RADIUS_AMPLITUDE
      const effectiveRadius = DRIFT_RADIUS + breathRadius

      desiredPosition.current.set(
        DEFAULT_TARGET.x + Math.cos(driftAngle.current) * effectiveRadius,
        DRIFT_HEIGHT + breathHeight,
        DEFAULT_TARGET.z + Math.sin(driftAngle.current) * effectiveRadius
      )
      desiredTarget.current.copy(DEFAULT_TARGET)
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