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
    g.translate(-center.x, -center.y, -center.z)
    g.scale(0.0030, 0.0034, 0.0025)
    g.computeBoundingBox()
    g.computeBoundingSphere()
    return g
  }, [gltf.scene])
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

function ShellZoneMesh({ zone, geometry }: { zone: ZoneId; geometry: THREE.BufferGeometry }) {
  return <Selectable zone={zone}><mesh geometry={geometry} castShadow receiveShadow><ZoneMaterial zone={zone} shell /></mesh></Selectable>
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
  const points = Array.from({ length: 7 }, (_, i) => ({ y: -0.73 - i * 0.118, x: 0.17 }))
  const z = 0.70
  return (
    <Selectable zone="laces"><group>
      <RoundedBox args={[0.39, 0.92, 0.045]} radius={0.075} smoothness={5} position={[0.05, -1.04, z - 0.045]}><meshStandardMaterial color="#111318" roughness={0.95} /></RoundedBox>
      {points.map(({ y, x }, i) => <group key={i}>{[-x, x].map((xx) => <mesh key={xx} position={[xx + 0.05, y, z]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.027, 0.007, 8, 20]} /><meshStandardMaterial color="#b9bdc2" metalness={0.55} roughness={0.32} /></mesh>)}</group>)}
      {points.slice(0, -1).flatMap((p, i) => { const n = points[i + 1]; return [<TubeBetween key={`a-${i}`} zone="laces" radius={0.014} start={[-p.x + 0.05, p.y, z + 0.012]} end={[n.x + 0.05, n.y, z + 0.012]} />, <TubeBetween key={`b-${i}`} zone="laces" radius={0.014} start={[p.x + 0.05, p.y, z + 0.016]} end={[-n.x + 0.05, n.y, z + 0.016]} />] })}
    </group></Selectable>
  )
}

function VelcroClosure({ closure }: { closure: ClosureId }) {
  if (closure === 'lace') return null
  const y = closure === 'hybrid' ? -1.43 : -1.17
  return <Selectable zone="wristTop"><group>
    <RoundedBox args={[1.32, 0.31, 0.15]} radius={0.08} smoothness={6} position={[0.00, y, -0.48]} rotation={[0, 0, -0.035]}><ZoneMaterial zone="wristTop" /></RoundedBox>
    <RoundedBox args={[0.30, 0.31, 0.86]} radius={0.08} smoothness={6} position={[0.60, y, -0.07]} rotation={[0, -0.12, -0.035]}><ZoneMaterial zone="wristTop" /></RoundedBox>
    <RoundedBox args={[0.76, 0.19, 0.024]} radius={0.035} smoothness={4} position={[-0.17, y, -0.565]} rotation={[0, 0, -0.035]}><meshStandardMaterial color="#24272d" roughness={0.98} /></RoundedBox>
  </group></Selectable>
}

function CuffReinforcement({ count }: { count: number }) {
  if (count <= 0) return null
  const ys = count === 1 ? [-1.18] : count === 2 ? [-1.06, -1.34] : [-0.99, -1.23, -1.47]
  return <Selectable zone="wristTop"><group>{ys.map((y) => <RoundedBox key={y} args={[0.98, 0.105, 0.075]} radius={0.045} smoothness={5} position={[0, y, -0.66]}><ZoneMaterial zone="wristTop" /></RoundedBox>)}</group></Selectable>
}

function TrimAndStitching({ width }: { width: number }) {
  const thickness = 0.022 + width * 0.010
  return <group>
    <Selectable zone="trim"><RoundedBox args={[1.05, 0.045 + width * 0.018, 0.055]} radius={0.025} smoothness={4} position={[0, -0.69, -0.52]}><ZoneMaterial zone="trim" /></RoundedBox></Selectable>
    <TubeBetween zone="stitching" radius={0.007} start={[-0.48, -0.655, -0.556]} end={[0.48, -0.655, -0.556]} />
    <TubeBetween zone="trim" radius={thickness * 0.45} start={[-0.51, -0.705, -0.55]} end={[0.51, -0.705, -0.55]} />
  </group>
}

function GripBar() {
  const gripBar = useGloveStore((s) => s.gripBar)
  if (gripBar === 'none') return null
  const thick = gripBar === 'thick'
  return <Selectable zone="gripBar"><RoundedBox args={[0.78, thick ? 0.20 : 0.16, thick ? 0.13 : 0.10]} radius={0.07} smoothness={6} position={[-0.08, 0.05, 0.73]} rotation={[0.03, 0.04, -0.08]}><ZoneMaterial zone="gripBar" /></RoundedBox></Selectable>
}

function VentHoles() {
  const palmVent = useGloveStore((s) => s.palmVent)
  const thumbVent = useGloveStore((s) => s.thumbVent)
  return <group>
    {palmVent && [-0.25, 0, 0.25].flatMap((x) => [-0.28, -0.05].map((y) => <mesh key={`p-${x}-${y}`} position={[x, y, 0.825]}><sphereGeometry args={[0.022, 12, 8]} /><meshStandardMaterial color="#08090c" roughness={1} /></mesh>))}
    {thumbVent && [[0.55, 0.18, 0.55], [0.58, 0.35, 0.50], [0.60, 0.50, 0.44]].map((p, i) => <mesh key={`t-${i}`} position={p as [number, number, number]}><sphereGeometry args={[0.018, 12, 8]} /><meshStandardMaterial color="#08090c" roughness={1} /></mesh>)}
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
  return pair === 'pair' ? <><Glove x={-1.02} /><Glove mirrored x={1.02} /></> : <Glove />
}

useGLTF.preload(REAL_GLOVE_URL)
