import Starfield from '../background/Starfield'
import NebulaLayer from '../background/NebulaLayer'
import DustClouds from '../background/DustClouds'
import ForegroundDust from '../background/ForegroundDust'
import BackgroundPlanets from '../BackgroundPlanets'
import Lighting from './Lighting'
import CameraRig from '../CameraRig'
import Galaxy from '../galaxy/Galaxy'
import { SPACE } from '../utils/colors'

/**
 * Stage 2 — Space + ONE static Jumia galaxy.
 * No Jiji. No products. No bloom. No animation.
 */
export default function SpaceScene() {
  return (
    <>
      <color attach="background" args={[SPACE.void]} />
      <fog attach="fog" args={[SPACE.void, 200, 450]} />

      <Lighting />

      {/* Stage 1 atmosphere */}
      <NebulaLayer />
      <Starfield />
      <DustClouds />
      <BackgroundPlanets />
      <ForegroundDust />

      {/* Stage 2 — Jumia only */}
      <Galaxy
        center={{ x: 48, y: 0, z: -12 }}
        radius={50}
      />

      <CameraRig selectedNode={null} />
    </>
  )
}
