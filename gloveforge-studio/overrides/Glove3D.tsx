import { RoundedBox, useGLTF } from '@react-three/drei'
import { useEffect, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { useGloveStore } from '../store'
import type { ClosureId, ZoneId } from '../types'
import { ZoneMaterial } from './ZoneMaterial'

const REAL_GLOVE_URL = '/glove-model/scene.gltf'

const modelProfiles = {
  mexican: [0.94, 0.98, 0.92] as const,
  japanese: [0.98, 1.00, 0.90] as const,
  american: [1.02, 1.02, 0.96] as const,
  sparring: [1.08, 1.04, 1.05] as const,
}

type ZoneGeometryMap = Record<'knuckle' | 'backhand' | 'palm' | 'thumb' | 'cuff', THREE.BufferGeometry>

function Selectable({ zone, children }: { zone: ZoneId; children: ReactNode }) {
  const selected = useGloveStore((s) => s.selectedZone === zone)
  const setSelected = useGloveStore((s) => s.setSelectedZone)
  return (
    <group onPointerDown={(e) => { e.stopPropagation(); setSelected(zone) }}>
      {children}
      {selected && <pointLight intensity={0.32} distance={2.2} position={[0, 0.25, 1.35]} />}
    </group>
  )
}

function useRealGloveGeometry() {
  const gltf = useGLTF(REAL_GLOVE_URL) as unknown as { scene: THREE.Group }
  const result = useMemo(() => {
    gltf.scene.updateMatrixWorld(true)
    let sourceMesh: THREE.Mesh | null = null
    gltf.scene.traverse((obj) => {
      if (!sourceMesh && (obj as THREE.Mesh).isMesh) sourceMesh = obj as THREE.Mesh
    })
    if (!sourceMesh) throw new Error('Real boxing glove mesh not found')

    const mesh = sourceMesh as THREE.Mesh
    const src = mesh.geometry.toNonIndexed()
    const pos = src.getAttribute('position') as THREE.BufferAttribute
    const normal = src.getAttribute('normal') as THREE.BufferAttribute | undefined
    const uv = src.getAttribute('uv') as THREE.BufferAttribute | undefined

    const worldBox = new THREE.Box3().setFromObject(gltf.scene)
    const center = worldBox.getCenter(new THREE.Vector3())
    const fit = new THREE.Vector3(0.30, 0.34, 0.25)
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)

    const zoneData: Record<keyof ZoneGeometryMap, { p: number[]; n: number[]; uv: number[] }> = {
      knuckle: { p: [], n: [], uv: [] },
      backhand: { p: [], n: [], uv: [] },
      palm: { p: [], n: [], uv: [] },
      thumb: { p: [], n: [], uv: [] },
      cuff: { p: [], n: [], uv: [] },
    }

    const tmpN = new THREE.Vector3()
    const tri = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]

    const readWorldPos = (i: number, out: THREE.Vector3) => {
      out.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mesh.matrixWorld)
      out.sub(center).multiply(fit)
      return out
    }

    for (let i = 0; i < pos.count; i += 3) {
      for (let k = 0; k < 3; k++) readWorldPos(i + k, tri[k])
      const c = tri[0].clone().add(tri[1]).add(tri[2]).multiplyScalar(1 / 3)

      let zone: keyof ZoneGeometryMap
      if (c.y < -0.72) zone = 'cuff'
      else if (c.x > 0.34 && c.y > -0.28 && c.y < 0.86) zone = 'thumb'
      else if (c.y > 0.82) zone = 'knuckle'
      else if (c.z > 0.02) zone = 'palm'
      else zone = 'backhand'

      const out = zoneData[zone]
      for (let k = 0; k < 3; k++) {
        const idx = i + k
        const p = tri[k]
        out.p.push(p.x, p.y, p.z)

        if (normal) {
          tmpN.set(normal.getX(idx), normal.getY(idx), normal.getZ(idx)).applyMatrix3(normalMatrix)
          tmpN.set(tmpN.x / fit.x, tmpN.y / fit.y, tmpN.z / fit.z).normalize()
          out.n.push(tmpN.x, tmpN.y, tmpN.z)
        }
        if (uv) out.uv.push(uv.getX(idx), uv.getY(idx))
      }
    }

    const geometries = {} as ZoneGeometryMap
    ;(Object.keys(zoneData) as (keyof ZoneGeometryMap)[]).forEach((zone) => {
      const d = zoneData[zone]
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3))
      if (d.n.length) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(d.n, 3))
      else geometry.computeVertexNormals()
      if (d.uv.length) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2))
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()
      geometries[zone] = geometry
    })
    src.dispose()
    return geometries
  }, [gltf.scene])

  useEffect(() => () => {
    Object.values(result).forEach((g) => g.dispose())
  }, [result])

  return result
}

function ZoneMesh({ zone, geometry }: { zone: keyof ZoneGeometryMap; geometry: THREE.BufferGeometry }) {
  return (
    <Selectable zone={zone}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <ZoneMaterial zone={zone} />
      </mesh>
    </Selectable>
  )
}

function LaceSegment({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...start)
    const b = new THREE.Vector3(...end)
    const delta = b.clone().sub(a)
    return {
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()),
      length: delta.length(),
    }
  }, [start, end])
  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[0.018, 0.018, length, 10]} />
      <meshStandardMaterial color="#f2efe6" roughness={0.88} />
    </mesh>
  )
}

function EllipticTube({ y, rx, rz, thickness, zone }: { y: number; rx: number; rz: number; thickness: number; zone: ZoneId }) {
  const geometry = useMemo(() => {
    const points = Array.from({ length: 40 }, (_, i) => {
      const a = (i / 40) * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * rx, y, Math.sin(a) * rz)
    })
    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5)
    return new THREE.TubeGeometry(curve, 80, thickness, 8, true)
  }, [y, rx, rz, thickness])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <Selectable zone={zone}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <ZoneMaterial zone={zone} />
      </mesh>
    </Selectable>
  )
}

function LaceClosure({ closure, frontZ }: { closure: ClosureId; frontZ: number }) {
  if (closure === 'velcro') return null
  const rows = 7
  const points = Array.from({ length: rows }, (_, i) => ({ y: -0.72 - i * 0.125, x: 0.19 }))
  const z = frontZ + 0.035
  return (
    <group>
      <RoundedBox args={[0.36, 0.95, 0.045]} radius={0.08} smoothness={4} position={[0.02, -1.05, z - 0.035]}>
        <meshStandardMaterial color="#0f1014" roughness={0.96} />
      </RoundedBox>
      {points.map(({ y, x }, i) => (
        <group key={i}>
          {[-x, x].map((xx) => (
            <mesh key={xx} position={[xx, y, z]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.031, 0.008, 8, 18]} />
              <meshStandardMaterial color="#c8c9cc" metalness={0.55} roughness={0.34} />
            </mesh>
          ))}
        </group>
      ))}
      {points.slice(0, -1).flatMap((p, i) => {
        const n = points[i + 1]
        return [
          <LaceSegment key={`l-${i}`} start={[-p.x, p.y, z + 0.012]} end={[n.x, n.y, z + 0.012]} />,
          <LaceSegment key={`r-${i}`} start={[p.x, p.y, z + 0.017]} end={[-n.x, n.y, z + 0.017]} />,
        ]
      })}
    </group>
  )
}

function VelcroClosure({ closure, frontZ }: { closure: ClosureId; frontZ: number }) {
  if (closure === 'lace') return null
  const y = closure === 'hybrid' ? -1.47 : -1.22
  return (
    <Selectable zone="cuff">
      <group>
        <RoundedBox args={[1.55, 0.30, 0.14]} radius={0.07} smoothness={5} position={[0.05, y, frontZ + 0.07]} rotation={[0, 0, -0.055]}>
          <ZoneMaterial zone="cuff" />
        </RoundedBox>
        <RoundedBox args={[0.30, 0.31, 1.20]} radius={0.07} smoothness={5} position={[0.72, y, 0.02]} rotation={[0, -0.14, -0.055]}>
          <ZoneMaterial zone="cuff" />
        </RoundedBox>
        <RoundedBox args={[0.72, 0.19, 0.025]} radius={0.04} smoothness={4} position={[-0.18, y, frontZ + 0.15]} rotation={[0, 0, -0.055]}>
          <meshStandardMaterial color="#25272c" roughness={0.98} />
        </RoundedBox>
      </group>
    </Selectable>
  )
}

function Glove({ mirrored = false, x = 0 }: { mirrored?: boolean; x?: number }) {
  const geometries = useRealGloveGeometry()
  const model = useGloveStore((s) => s.model)
  const weight = useGloveStore((s) => s.weightOz)
  const cuff = useGloveStore((s) => s.cuff)
  const closure = useGloveStore((s) => s.closure)
  const p = modelProfiles[model]
  const weightScale = 0.95 + (weight - 8) * 0.009
  const sx = mirrored ? -1 : 1
  const cuffCount = cuff === 'simple' ? 1 : cuff === 'double' ? 2 : 3
  const frontZ = 0.87
  const rollYs = cuffCount === 1 ? [-1.22] : cuffCount === 2 ? [-1.08, -1.38] : [-0.98, -1.24, -1.50]

  return (
    <group position={[x, 0.05, 0]} scale={[sx * p[0] * weightScale, p[1] * weightScale, p[2] * weightScale]} rotation={[0.02, mirrored ? -0.08 : 0.08, mirrored ? 0.02 : -0.02]}>
      <ZoneMesh zone="knuckle" geometry={geometries.knuckle} />
      <ZoneMesh zone="backhand" geometry={geometries.backhand} />
      <ZoneMesh zone="palm" geometry={geometries.palm} />
      <ZoneMesh zone="thumb" geometry={geometries.thumb} />
      <ZoneMesh zone="cuff" geometry={geometries.cuff} />
      <EllipticTube y={-0.72} rx={0.83} rz={0.60} thickness={0.022} zone="piping" />
      {rollYs.map((y) => <EllipticTube key={y} y={y} rx={0.76} rz={0.56} thickness={0.035} zone="rolls" />)}
      <LaceClosure closure={closure} frontZ={frontZ} />
      <VelcroClosure closure={closure} frontZ={frontZ} />
    </group>
  )
}

export function Glove3D() {
  const pair = useGloveStore((s) => s.pairView)
  return pair === 'pair' ? <><Glove x={-1.05} /><Glove mirrored x={1.05} /></> : <Glove />
}

useGLTF.preload(REAL_GLOVE_URL)
