import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { createSurfaceTextures, materialProps } from '../lib/surfaceTexture'
import { useGloveStore } from '../store'
import type { ZoneId } from '../types'

const shellZoneIds: Partial<Record<ZoneId, number>> = {
  gloveTop: 0,
  backhand: 1,
  palm: 2,
  thumbOutside: 3,
  thumbInside: 4,
  thumbBase: 5,
  wristTop: 6,
  wristBottom: 7,
}

const maskShader = `
float gfZone(vec3 p, vec3 n) {
  if (p.y < -0.72) return p.z > 0.06 ? 7.0 : 6.0;
  bool thumb = p.x > 0.28 && p.y > -0.56 && p.y < 1.05;
  if (thumb) {
    if (p.y < -0.08) return 5.0;
    return p.z > 0.08 ? 4.0 : 3.0;
  }
  if (p.y > 0.94) return 0.0;
  if (p.z > 0.08) return 2.0;
  return 1.0;
}
`

export function ZoneMaterial({ zone, shell = false }: { zone: ZoneId; shell?: boolean }) {
  const style = useGloveStore((s) => s.zones[zone])
  const design = useGloveStore((s) => s.design)
  const [textures, setTextures] = useState<{ map: THREE.Texture | null; bumpMap: THREE.Texture | null }>({ map: null, bumpMap: null })
  const originalNormal = useTexture('/glove-model/textures/main_normal.png')
  originalNormal.wrapS = originalNormal.wrapT = THREE.RepeatWrapping
  originalNormal.colorSpace = THREE.NoColorSpace
  const relevant = design.layers.filter((l) => l.visible && l.scope.includes(zone))
  const designKey = relevant.map((l) => [l.id, l.imageDataUrl.length, l.imageDataUrl.slice(-72), l.mode, l.opacity, l.scale, l.rotation, l.offsetX, l.offsetY, l.repeat, l.visible, l.scope.join(',')].join(':')).join('|')

  useEffect(() => {
    let alive = true
    let created: { map: THREE.Texture; bumpMap: THREE.Texture } | null = null
    createSurfaceTextures(style.color, style.material, design, zone).then((t) => {
      created = t
      if (alive) setTextures(t)
      else { t.map.dispose(); t.bumpMap.dispose() }
    })
    return () => {
      alive = false
      created?.map.dispose()
      created?.bumpMap.dispose()
    }
  }, [style.color, style.material, designKey, zone])

  const props = useMemo(() => materialProps(style.material), [style.material])
  const hasEmboss = relevant.some((l) => l.mode === 'emboss')
  const hasFoil = relevant.some((l) => l.mode === 'foil')
  const zoneIndex = shellZoneIds[zone]

  const onBeforeCompile = useMemo(() => {
    if (!shell || zoneIndex === undefined) return undefined
    return (shader: any) => {
      shader.uniforms.gfZoneId = { value: zoneIndex }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 gfObjPos;\nvarying vec3 gfObjNormal;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ngfObjPos = position;\ngfObjNormal = normal;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 gfObjPos;\nvarying vec3 gfObjNormal;\nuniform float gfZoneId;\n${maskShader}`)
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (abs(gfZone(gfObjPos, normalize(gfObjNormal)) - gfZoneId) > 0.25) discard;')
    }
  }, [shell, zoneIndex])

  return (
    <meshPhysicalMaterial
      map={textures.map ?? undefined}
      bumpMap={textures.bumpMap ?? undefined}
      bumpScale={hasEmboss ? 0.065 : style.material === 'pebbled' || style.material === 'python' || style.material === 'croc' ? 0.026 : 0.009}
      normalMap={shell ? originalNormal : undefined}
      normalScale={shell ? new THREE.Vector2(0.42, 0.42) : undefined}
      roughness={props.roughness}
      metalness={hasFoil ? Math.max(0.5, props.metalness) : props.metalness}
      clearcoat={props.clearcoat}
      clearcoatRoughness={props.clearcoatRoughness}
      color={textures.map ? '#ffffff' : style.color}
      onBeforeCompile={onBeforeCompile}
      customProgramCacheKey={() => shell ? `gf-shell-${zone}` : `gf-zone-${zone}`}
      polygonOffset={shell}
      polygonOffsetFactor={shell ? -1 : 0}
      polygonOffsetUnits={shell ? -1 : 0}
    />
  )
}
