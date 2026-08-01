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
import ProductNode from '../ProductNode'
import { getGalaxyCenters, getGalaxyRadius } from '../galaxyLayout'
import { SPACE } from '../utils/colors'

const JUMIA = { x: 36, y: 0, z: -6 }
const JIJI = { x: 92, y: -4, z: -28 }

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
    ? { x: centers.Jumia.x, y: 0, z: centers.Jumia.z }
    : JUMIA
  const jijiCenter = centers.Jiji
    ? { x: centers.Jiji.x, y: -2, z: centers.Jiji.z }
    : JIJI

  const jumiaCount = nodes.filter((n) => n.site === 'Jumia').length
  const jijiCount = nodes.filter((n) => n.site === 'Jiji').length

  return (
    <>
      <color attach="background" args={[SPACE.void]} />
      <fog attach="fog" args={['#03030a', 120, 380]} />

      <Lighting />

      <NebulaLayer galaxyPos={[jumiaCenter.x, 0, jumiaCenter.z]} />
      <DistantGalaxies />
      <Starfield />
      <VolumeDust galaxyPos={[jumiaCenter.x, 0, jumiaCenter.z]} />
      <DustClouds />

      <GalaxySpill position={[jumiaCenter.x, 0, jumiaCenter.z]} color="#ff8a30" radius={radius * 1.1} />
      <GalaxySpill position={[jijiCenter.x, jijiCenter.y, jijiCenter.z]} color="#22d0e8" radius={radius * 0.75} />

      <BackgroundPlanets />

      {/* Jumia — larger orange */}
      <Galaxy
        center={jumiaCenter}
        radius={radius}
        theme="orange"
        spin={0.01}
      />
      <GalaxyLabel
        center={jumiaCenter}
        site="Jumia"
        count={jumiaCount}
        color="#ff9a2a"
        galaxyRadius={radius}
      />

      {/* Jiji — smaller cyan */}
      <Galaxy
        center={jijiCenter}
        radius={radius * 0.72}
        theme="cyan"
        spin={0.014}
      />
      <GalaxyLabel
        center={jijiCenter}
        site="Jiji"
        count={jijiCount}
        color="#22d8f0"
        galaxyRadius={radius * 0.72}
      />

      {/* Product cards in arms */}
      {nodes.map((node) => (
        <ProductNode
          key={node.id}
          node={node}
          isSelected={node.id === selectedId}
          onSelect={(n) => onSelect(n?.id ?? n)}
        />
      ))}

      <ForegroundDust />
      <CameraRig selectedNode={nodes.find((n) => n.id === selectedId) ?? null} />
    </>
  )
}
