import Starfield from '../background/Starfield'
import NebulaLayer from '../background/NebulaLayer'
import DustClouds from '../background/DustClouds'
import ForegroundDust from '../background/ForegroundDust'
import DistantGalaxies from '../background/DistantGalaxies'
import VolumeDust from '../background/VolumeDust'
import GalaxySpill from '../background/GalaxySpill'
import BackgroundPlanets from '../BackgroundPlanets'
import Lighting from './Lighting'
import CameraRig from '../CameraRig'
import Galaxy from '../galaxy/Galaxy'
import GalaxyLabel from '../GalaxyLabel'
import { getGalaxyCenters, getGalaxyRadius } from '../galaxyLayout'
import { SPACE } from '../utils/colors'

const JUMIA = { x: 168, y: -20, z: -30 }
const JIJI = { x: 132, y: 8, z: -4 }

/**
 * Full concept scene:
 * cinematic space + Jumia (orange) + Jiji (cyan) + product cards + labels
 */
export default function SpaceScene({
  nodes = [],
  selectedId = null,
  onSelect = () => {},
}) {
  const centers = getGalaxyCenters()
  const radius = getGalaxyRadius()

  const jumiaCenter = centers.Jumia
    ? { x: centers.Jumia.x, y: -20, z: centers.Jumia.z }
    : JUMIA
  const jijiCenter = centers.Jiji
    ? { x: centers.Jiji.x, y: 8, z: centers.Jiji.z }
    : JIJI

  const jumiaCount = nodes.filter((n) => n.site === 'Jumia').length
  const jijiCount = nodes.filter((n) => n.site === 'Jiji').length

  return (
    <>
      <color attach="background" args={['#000005']} />
      <fog attach="fog" args={['#000005', 180, 480]} />

      <Lighting />

      <NebulaLayer galaxyPos={[jumiaCenter.x, 0, jumiaCenter.z]} />
      <DistantGalaxies />
      <Starfield />
      <VolumeDust galaxyPos={[jumiaCenter.x, 0, jumiaCenter.z]} />
      <DustClouds />

      <GalaxySpill position={[jumiaCenter.x, jumiaCenter.y, jumiaCenter.z]} color="#ff8a30" radius={radius * 0.5} />
      <GalaxySpill position={[jijiCenter.x, jijiCenter.y, jijiCenter.z]} color="#22d0e8" radius={radius * 0.55} />

      <BackgroundPlanets />

      {/* Jumia — larger orange; products ride the rotating arms */}
      {/* Jumia — smaller orange */}
      <Galaxy
        center={jumiaCenter}
        radius={radius}
        theme="orange"
        spin={0.012}
        products={nodes.filter((n) => n.site === 'Jumia')}
        selectedId={selectedId}
        onSelect={(n) => onSelect(n?.id ?? n)}
      />
      <GalaxyLabel
        center={jumiaCenter}
        site="Jumia"
        count={jumiaCount}
        color="#ff9a2a"
        galaxyRadius={radius}
      />

      {/* Jiji — larger cyan (more products) */}
      <Galaxy
        center={jijiCenter}
        radius={radius}
        theme="cyan"
        spin={0.015}
        products={nodes.filter((n) => n.site === 'Jiji')}
        selectedId={selectedId}
        onSelect={(n) => onSelect(n?.id ?? n)}
      />
      <GalaxyLabel
        center={jijiCenter}
        site="Jiji"
        count={jijiCount}
        color="#22d8f0"
        galaxyRadius={radius}
      />

      <ForegroundDust />
      <CameraRig selectedNode={nodes.find((n) => n.id === selectedId) ?? null} />
    </>
  )
}
