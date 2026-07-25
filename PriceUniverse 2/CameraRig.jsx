import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Pulled in closer than the previous pass (30,20,92) — that framing
// correctly avoided occlusion/distortion but left both galaxies
// reading small relative to the reference mockup, where each galaxy
// occupies roughly half the hero's width. This is a moderate ~25%
// distance reduction, paired with a small GALAXY_RADIUS bump in
// galaxyLayout.js, rather than one large change on either lever —
// distance-only changes have previously overshot into occlusion or
// undershot into tininess when adjusted alone.
// Target/position updated for the widened galaxy centers (radius
// 18->26 required moving centers from x:14/68 to x:14/92 to avoid
// overlap) — target re-centered to the new midpoint (~53,-21), camera
// pulled back moderately from the previous (24,16,70) to keep both
// larger galaxies fully in frame without re-introducing the occlusion
// issues hit when this was tuned for the smaller radius.
// Target/position updated for the widened galaxy centers (radius
// 18->26 required moving centers from x:14/68 to x:14/92 to avoid
// overlap) — target re-centered to the new midpoint (~53,-21), camera
// pulled back moderately from the previous (24,16,70) to keep both
// larger galaxies fully in frame without re-introducing the occlusion
// issues hit when this was tuned for the smaller radius.
//
// A later +10x pan (to clear Jumia from the text panel) was reverted —
// it overcorrected, pushing Jumia almost entirely off-frame and
// placing Jupiter's new position directly behind the text instead.
// The text-overlap issue is being fixed by moving Jupiter, not by
// panning the whole camera again.
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(30, 20, 88)
const DEFAULT_TARGET = new THREE.Vector3(53, 1, -21)
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