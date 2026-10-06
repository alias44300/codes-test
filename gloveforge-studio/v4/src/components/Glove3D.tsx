import { RoundedBox, useGLTF } from '@react-three/drei'
import { useEffect, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { useGloveStore } from '../store'
import type { ClosureId, ZoneId } from '../types'
import { ZoneMaterial } from './ZoneMaterial'

const REAL_GLOVE_URL = '/glove-model/scene.gltf'

const modelProfiles = {
  elite: [1.00, 1.00, 1.00] as const,
  mexican: [0.95, 0.99, 0.93] as const,
  japanese: [0.99, 1.02, 0.92] as const,
  american: [1.035, 1.02, 0.98] as const,
  sparring: [1.075, 1.045, 1.055] as const,
  fight: [0.92, 0.95, 0.89] as const,
}

const shellZones: ZoneId[] = ['gloveTop', 'backhand', 'palm', 'thumbOutside', 'thumbInside', 'thumbBase', 'wristTop', 'wristBottom']

function Selectable({ zone, children }: { zone: ZoneId; children: ReactNode }) {
  const selected = useGloveStore((s) => s.selectedZone === zone)
  const setSelected = useGloveStore((s) => s.setSelectedZone)
  return (
    <group onPointerDown={(e) => { e.stopPropagation(); setSelected(zone) }}>
      {children}
      {selected && <pointLight intensity={0.25} distance={1.8} position={[0, 0.1, 1.15]} />}
    </group>
  )
}

function useRealGloveGeometry() {
  const gltf = useGLTF(REAL_GLOVE_URL) as unknown as { scene: THREE.Group }
  const geometry = useMemo(() => {
    gltf.scene.updateMatrixWorld(true)
    let sourceMesh: THREE.Mesh | null = null
    gltf.scene.traverse((obj) => {
      if (!sourceMesh && (obj as THREE.Mesh).isMesh) sourceMesh = obj as THREE.Mesh
    })
    if (!sourceMesh) throw new Error('Real boxing glove mesh not found')

    const mesh = sourceMesh as THREE.Mesh
    const g = mesh.geometry.clone()
    g.applyMatrix4(mesh.matrixWorld)
    g.computeBoundingBox()

    const box = g.boundingBox!
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    g.translate(-center.x, -center.y, -center.z)

    const target = new THREE.Vector3(1.42, 2.34, 1.12)
    g.scale(target.x / size.x, target.y / size.y, target.z / size.z)
    g.computeVertexNormals()
    g.computeBoundingBox()
    g.computeBoundingSphere()
    return g
  }, [gltf.scene])

  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

function ShellZoneMesh({ zone, geometry }: { zone: ZoneId; geometry: THREE.BufferGeometry }) {
  return <Selectable zone={zone}><mesh geometry={geometry} castShadow receiveShadow frustumCulled={false}><ZoneMaterial zone={zone} shell /></mesh></Selectable>
}

function TubeBetween({ start, end, radius, zone }: { start: [number, number, number]; end: [number, number, number]; radius: number; zone: ZoneId }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...start)
    const b = new THREE.Vector3(...end)
    const delta = b.clone().sub(a)
    return { position: a.clone().add(b).multiplyScalar(0.5), quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()), length: delta.length() }
  }, [start, end])
  return <Selectable zone={zone}><mesh position={position} quaternion={quaternion} castShadow><cylinderGeometry args={[radius, radius, length, 12]} /><ZoneMaterial zone={zone} /></mesh></Selectable>
}

function LaceClosure({ closure }: { closure: ClosureId }) {
  if (closure === 'velcro') return null
  const rows = 6
  const leftX = -0.115
  const rightX = 0.115
  const z = 0.586
  const points = Array.from({ length: rows }, (_, i) => ({ y: -0.47 - i * 0.115 }))
  return (
    <Selectable zone="laces">
      <group position={[-0.06, 0, 0]}>
        <RoundedBox args={[0.085, 0.78, 0.030]} radius={0.025} smoothness={5} position={[leftX, -0.76, z - 0.012]}>
          <ZoneMaterial zone="wristTop" />
        </RoundedBox>
        <RoundedBox args={[0.085, 0.78, 0.030]} radius={0.025} smoothness={5} position={[rightX, -0.76, z - 0.012]}>
          <ZoneMaterial zone="wristTop" />
        </RoundedBox>
        <RoundedBox args={[0.026, 0.72, 0.018]} radius={0.010} smoothness={4} position={[0, -0.76, z + 0.004]}>
          <meshStandardMaterial color="#07090d" roughness={1} />
        </RoundedBox>
        {points.map(({ y }, i) => (
          <group key={`eye-${i}`}>
            <mesh position={[leftX, y, z + 0.012]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.020, 0.0055, 8, 18]} />
              <meshStandardMaterial color="#c8cbd0" metalness={0.62} roughness={0.28} />
            </mesh>
            <mesh position={[rightX, y, z + 0.012]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.020, 0.0055, 8, 18]} />
              <meshStandardMaterial color="#c8cbd0" metalness={0.62} roughness={0.28} />
            </mesh>
          </group>
        ))}
        {points.slice(0, -1).flatMap((p, i) => {
          const n = points[i + 1]
          return [
            <TubeBetween key={`lace-a-${i}`} zone="laces" radius={0.0075} start={[leftX, p.y, z + 0.022]} end={[rightX, n.y, z + 0.022]} />,
            <TubeBetween key={`lace-b-${i}`} zone="laces" radius={0.0075} start={[rightX, p.y, z + 0.026]} end={[leftX, n.y, z + 0.026]} />,
          ]
        })}
      </group>
    </Selectable>
  )
}

function VelcroClosure({ closure }: { closure: ClosureId }) {
  if (closure === 'lace') return null
  const y = closure === 'hybrid' ? -1.25 : -1.06
  return <Selectable zone="wristTop"><group>
    <RoundedBox args={[1.16, 0.25, 0.12]} radius={0.07} smoothness={6} position={[-0.02, y, -0.50]} rotation={[0, 0, -0.035]}><ZoneMaterial zone="wristTop" /></RoundedBox>
    <RoundedBox args={[0.25, 0.25, 0.72]} radius={0.07} smoothness={6} position={[0.52, y, -0.14]} rotation={[0, -0.12, -0.035]}><ZoneMaterial zone="wristTop" /></RoundedBox>
    <RoundedBox args={[0.66, 0.15, 0.022]} radius={0.03} smoothness={4} position={[-0.16, y, -0.57]} rotation={[0, 0, -0.035]}><meshStandardMaterial color="#24272d" roughness={0.98} /></RoundedBox>
  </group></Selectable>
}

function CuffReinforcement({ count }: { count: number }) {
  if (count <= 0) return null
  const ys = count === 1 ? [-1.04] : count === 2 ? [-0.98, -1.18] : [-0.92, -1.10, -1.28]
  return <Selectable zone="wristTop"><group>{ys.map((y) => <RoundedBox key={y} args={[0.88, 0.080, 0.050]} radius={0.035} smoothness={5} position={[0, y, -0.57]}><ZoneMaterial zone="wristTop" /></RoundedBox>)}</group></Selectable>
}

function TrimAndStitching({ width }: { width: number }) {
  const thickness = 0.018 + width * 0.008
  return <group>
    <Selectable zone="trim"><RoundedBox args={[1.00, 0.038 + width * 0.014, 0.045]} radius={0.022} smoothness={4} position={[0, -0.69, -0.56]}><ZoneMaterial zone="trim" /></RoundedBox></Selectable>
    <TubeBetween zone="stitching" radius={0.006} start={[-0.46, -0.655, -0.583]} end={[0.46, -0.655, -0.583]} />
    <TubeBetween zone="trim" radius={thickness * 0.45} start={[-0.49, -0.705, -0.58]} end={[0.49, -0.705, -0.58]} />
  </group>
}

function GripBar() {
  const gripBar = useGloveStore((s) => s.gripBar)
  if (gripBar === 'none') return null
  const thick = gripBar === 'thick'
  return <Selectable zone="gripBar"><RoundedBox args={[0.70, thick ? 0.18 : 0.145, thick ? 0.12 : 0.095]} radius={0.065} smoothness={6} position={[-0.06, -0.02, 0.60]} rotation={[0.03, 0.04, -0.08]}><ZoneMaterial zone="gripBar" /></RoundedBox></Selectable>
}

function VentHoles() {
  const palmVent = useGloveStore((s) => s.palmVent)
  const thumbVent = useGloveStore((s) => s.thumbVent)
  return <group>
    {palmVent && [-0.22, 0, 0.22].flatMap((x) => [-0.24, -0.04].map((y) => <mesh key={`p-${x}-${y}`} position={[x, y, 0.595]}><sphereGeometry args={[0.018, 12, 8]} /><meshStandardMaterial color="#08090c" roughness={1} /></mesh>))}
    {thumbVent && [[0.50, 0.15, 0.43], [0.52, 0.30, 0.39], [0.53, 0.44, 0.34]].map((p, i) => <mesh key={`t-${i}`} position={p as [number, number, number]}><sphereGeometry args={[0.015, 12, 8]} /><meshStandardMaterial color="#08090c" roughness={1} /></mesh>)}
  </group>
}

function Glove({ mirrored = false, x = 0 }: { mirrored?: boolean; x?: number }) {
  const geometry = useRealGloveGeometry()
  const model = useGloveStore((s) => s.model)
  const weight = useGloveStore((s) => s.weightOz)
  const padding = useGloveStore((s) => s.padding)
  const cuffLength = useGloveStore((s) => s.cuffLength)
  const reinforcement = useGloveStore((s) => s.reinforcement)
  const closure = useGloveStore((s) => s.closure)
  const trimWidth = useGloveStore((s) => s.trimWidth)
  const profile = modelProfiles[model]
  const weightScale = 0.94 + (weight - 8) * 0.008
  const paddingDepth = padding === 'protective' ? 1.07 : padding === 'fightHorsehair' ? 0.91 : padding === 'horsehairFoam' ? 0.96 : padding === 'latex' ? 0.99 : 1.02
  const cuffY = cuffLength === 'short' ? 0.96 : cuffLength === 'long' ? 1.055 : 1
  const sx = mirrored ? -1 : 1
  return <group position={[x, 0.05, 0]} scale={[sx * profile[0] * weightScale, profile[1] * weightScale * cuffY, profile[2] * weightScale * paddingDepth]} rotation={[0.015, mirrored ? -0.09 : 0.09, mirrored ? 0.02 : -0.02]}>
    {shellZones.map((zone) => <ShellZoneMesh key={zone} zone={zone} geometry={geometry} />)}
    <GripBar /><VentHoles /><TrimAndStitching width={trimWidth} /><CuffReinforcement count={reinforcement} /><LaceClosure closure={closure} /><VelcroClosure closure={closure} />
  </group>
}

export function Glove3D() {
  const pair = useGloveStore((s) => s.pairView)
  return pair === 'pair' ? <><Glove x={-0.95} /><Glove mirrored x={0.95} /></> : <Glove />
}

useGLTF.preload(REAL_GLOVE_URL)
