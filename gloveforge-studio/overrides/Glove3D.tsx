import { RoundedBox } from '@react-three/drei'
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { useGloveStore } from '../store'
import type { ClosureId, ZoneId } from '../types'
import { ZoneMaterial } from './ZoneMaterial'

const modelProfiles = {
  mexican: { width: 0.98, depth: 0.88, knuckleH: 0.72, bodyH: 1.30, thumbX: 0.68, thumbHook: 0.50 },
  japanese: { width: 1.02, depth: 0.84, knuckleH: 0.68, bodyH: 1.34, thumbX: 0.64, thumbHook: 0.58 },
  american: { width: 1.06, depth: 0.92, knuckleH: 0.76, bodyH: 1.35, thumbX: 0.72, thumbHook: 0.46 },
  sparring: { width: 1.12, depth: 0.98, knuckleH: 0.82, bodyH: 1.42, thumbX: 0.73, thumbHook: 0.56 },
}

function Selectable({ zone, children }: { zone: ZoneId; children: ReactNode }) {
  const selected = useGloveStore((s) => s.selectedZone === zone)
  const setSelected = useGloveStore((s) => s.setSelectedZone)
  return (
    <group onPointerDown={(e) => { e.stopPropagation(); setSelected(zone) }}>
      {children}
      {selected && <pointLight intensity={0.42} distance={2} position={[0, 0.3, 1.15]} />}
    </group>
  )
}

function LaceSegment({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...start)
    const b = new THREE.Vector3(...end)
    const delta = b.clone().sub(a)
    const length = delta.length()
    const position = a.clone().add(b).multiplyScalar(0.5)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize())
    return { position, quaternion, length }
  }, [start, end])
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.021, 0.021, length, 10]} />
      <meshStandardMaterial color="#f3f0e8" roughness={0.84} />
    </mesh>
  )
}

function CuffChannels({ count, backZ, width }: { count: number; backZ: number; width: number }) {
  const ys = count === 1 ? [-1.27] : count === 2 ? [-1.13, -1.40] : [-1.02, -1.28, -1.54]
  return (
    <Selectable zone="rolls">
      {ys.map((y, i) => (
        <RoundedBox key={i} args={[width, 0.15, 0.10]} radius={0.05} smoothness={5} position={[0, y, backZ]}>
          <ZoneMaterial zone="rolls" />
        </RoundedBox>
      ))}
    </Selectable>
  )
}

function LaceClosure({ closure, cuffFrontZ }: { closure: ClosureId; cuffFrontZ: number }) {
  if (closure === 'velcro') return null
  const rows = 7
  const points = Array.from({ length: rows }, (_, i) => ({ y: -0.62 - i * 0.145, x: 0.235 }))
  const z = cuffFrontZ + 0.085
  return (
    <group>
      <RoundedBox args={[0.42, 1.28, 0.055]} radius={0.12} smoothness={5} position={[0, -1.06, z - 0.045]}>
        <meshStandardMaterial color="#101116" roughness={0.94} />
      </RoundedBox>
      <mesh position={[0, -0.37, z - 0.03]} scale={[0.30, 0.22, 0.035]}>
        <sphereGeometry args={[0.6, 24, 16]} />
        <meshStandardMaterial color="#0c0d11" roughness={1} />
      </mesh>
      {points.map(({ y, x }, i) => (
        <group key={`eye-${i}`}>
          <mesh position={[-x, y, z]}>
            <torusGeometry args={[0.038, 0.009, 8, 18]} />
            <meshStandardMaterial color="#dedede" metalness={0.35} roughness={0.45} />
          </mesh>
          <mesh position={[x, y, z]}>
            <torusGeometry args={[0.038, 0.009, 8, 18]} />
            <meshStandardMaterial color="#dedede" metalness={0.35} roughness={0.45} />
          </mesh>
        </group>
      ))}
      {points.slice(0, -1).flatMap((p, i) => {
        const next = points[i + 1]
        return [
          <LaceSegment key={`a-${i}`} start={[-p.x, p.y, z + 0.018]} end={[next.x, next.y, z + 0.018]} />,
          <LaceSegment key={`b-${i}`} start={[p.x, p.y, z + 0.022]} end={[-next.x, next.y, z + 0.022]} />,
        ]
      })}
      <LaceSegment start={[-0.23, -1.53, z + 0.02]} end={[-0.43, -1.82, z + 0.02]} />
      <LaceSegment start={[0.23, -1.53, z + 0.02]} end={[0.43, -1.82, z + 0.02]} />
    </group>
  )
}

function VelcroClosure({ closure, frontZ }: { closure: ClosureId; frontZ: number }) {
  if (closure === 'lace') return null
  const y = closure === 'hybrid' ? -1.55 : -1.28
  return (
    <Selectable zone="cuff">
      <group>
        <RoundedBox args={[1.46, 0.34, 0.16]} radius={0.09} smoothness={5} position={[0.02, y, frontZ + 0.105]} rotation={[0, 0, -0.055]}>
          <ZoneMaterial zone="cuff" />
        </RoundedBox>
        <RoundedBox args={[0.34, 0.36, 0.78]} radius={0.09} smoothness={5} position={[0.68, y, 0.08]} rotation={[0, -0.18, -0.05]}>
          <ZoneMaterial zone="cuff" />
        </RoundedBox>
        <RoundedBox args={[0.73, 0.23, 0.03]} radius={0.05} smoothness={4} position={[-0.21, y, frontZ + 0.198]} rotation={[0, 0, -0.055]}>
          <meshStandardMaterial color="#25272d" roughness={0.95} />
        </RoundedBox>
      </group>
    </Selectable>
  )
}

function PalmDetails({ width, frontZ }: { width: number; frontZ: number }) {
  return (
    <Selectable zone="palm">
      <group>
        <mesh position={[-0.03, 0.19, frontZ + 0.15]} rotation={[0, 0, Math.PI / 2 + 0.10]} scale={[0.92 * width, 0.11, 0.13]}>
          <capsuleGeometry args={[0.36, 0.68, 6, 22]} />
          <ZoneMaterial zone="palm" />
        </mesh>
        <RoundedBox args={[0.94 * width, 0.28, 0.18]} radius={0.11} smoothness={5} position={[-0.06, 0.54, frontZ + 0.08]} rotation={[0.03, 0, -0.04]}>
          <ZoneMaterial zone="palm" />
        </RoundedBox>
      </group>
    </Selectable>
  )
}

function Thumb({ x, hook, frontZ }: { x: number; hook: number; frontZ: number }) {
  return (
    <Selectable zone="thumb">
      <group>
        <mesh position={[x, 0.03, 0.24]} rotation={[0.18, 0.08, -0.42]} scale={[0.42, 0.66, 0.43]}>
          <capsuleGeometry args={[0.34, 0.50, 7, 26]} />
          <ZoneMaterial zone="thumb" />
        </mesh>
        <mesh position={[x + 0.06, 0.45, 0.17]} rotation={[0.22, 0.05, -0.80 * hook]} scale={[0.37, 0.55, 0.39]}>
          <capsuleGeometry args={[0.31, 0.37, 7, 24]} />
          <ZoneMaterial zone="thumb" />
        </mesh>
        <mesh position={[x - 0.19, 0.38, frontZ + 0.09]} rotation={[0.05, 0, -0.52]} scale={[0.16, 0.52, 0.10]}>
          <capsuleGeometry args={[0.28, 0.38, 5, 18]} />
          <ZoneMaterial zone="thumb" />
        </mesh>
      </group>
    </Selectable>
  )
}

function Glove({ mirrored = false, x = 0 }: { mirrored?: boolean; x?: number }) {
  const model = useGloveStore((s) => s.model)
  const weight = useGloveStore((s) => s.weightOz)
  const cuff = useGloveStore((s) => s.cuff)
  const closure = useGloveStore((s) => s.closure)
  const p = modelProfiles[model]
  const weightScale = 0.91 + (weight - 8) * 0.013
  const sx = mirrored ? -1 : 1
  const cuffCount = cuff === 'simple' ? 1 : cuff === 'double' ? 2 : 3
  const laceLike = closure === 'lace' || closure === 'hybrid'
  const cuffH = laceLike ? 1.06 : 0.88
  const cuffY = laceLike ? -1.23 : -1.15
  const cuffW = laceLike ? 1.22 : 1.34
  const frontZ = 0.45 * p.depth
  const cuffFrontZ = 0.42

  return (
    <group position={[x, 0.15, 0]} scale={[sx * weightScale, weightScale, weightScale]} rotation={[0.025, mirrored ? -0.07 : 0.07, mirrored ? 0.035 : -0.035]}>
      <Selectable zone="knuckle">
        <RoundedBox args={[1.38 * p.width, p.knuckleH, 0.86 * p.depth]} radius={0.26} smoothness={8} position={[0, 0.77, -0.02]} rotation={[0.06, 0, 0]}>
          <ZoneMaterial zone="knuckle" />
        </RoundedBox>
      </Selectable>
      <Selectable zone="backhand">
        <RoundedBox args={[1.28 * p.width, p.bodyH, 0.78 * p.depth]} radius={0.30} smoothness={8} position={[0, 0.04, -0.08]} scale={[0.98, 1, 1]}>
          <ZoneMaterial zone="backhand" />
        </RoundedBox>
        <RoundedBox args={[1.08 * p.width, 0.54, 0.72 * p.depth]} radius={0.18} smoothness={6} position={[0, -0.66, -0.06]}>
          <ZoneMaterial zone="backhand" />
        </RoundedBox>
      </Selectable>
      <Selectable zone="palm">
        <RoundedBox args={[1.05 * p.width, 1.16, 0.18]} radius={0.20} smoothness={7} position={[-0.035, -0.02, frontZ]} rotation={[0.025, 0, -0.025]}>
          <ZoneMaterial zone="palm" />
        </RoundedBox>
      </Selectable>
      <PalmDetails width={p.width} frontZ={frontZ} />
      <Thumb x={p.thumbX} hook={p.thumbHook} frontZ={frontZ} />
      <Selectable zone="cuff">
        <RoundedBox args={[cuffW, cuffH, 0.82]} radius={0.12} smoothness={7} position={[0, cuffY, -0.03]}>
          <ZoneMaterial zone="cuff" />
        </RoundedBox>
      </Selectable>
      <CuffChannels count={cuffCount} backZ={-0.47} width={cuffW * 0.91} />
      <Selectable zone="piping">
        <RoundedBox args={[1.17 * p.width, 0.055, 0.86]} radius={0.024} smoothness={4} position={[0, -0.69, -0.03]}>
          <ZoneMaterial zone="piping" />
        </RoundedBox>
      </Selectable>
      <LaceClosure closure={closure} cuffFrontZ={cuffFrontZ} />
      <VelcroClosure closure={closure} frontZ={cuffFrontZ} />
    </group>
  )
}

export function Glove3D() {
  const pair = useGloveStore((s) => s.pairView)
  return pair === 'pair' ? <><Glove x={-0.92} /><Glove mirrored x={0.92} /></> : <Glove />
}
