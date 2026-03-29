import { useTexture } from '@react-three/drei'
import { useManagedMaterial } from '../hooks/use-managed-material'
import type { Texture } from 'three'
import type { Preview3DShape } from '@/features/preview/types'
import type {
  MapDef,
  MapKey,
  MaterialType,
  StandardMaterialSettings,
} from '../lib/material-definitions'

type EffectiveShape = Exclude<Preview3DShape, 'custom'>

export function toEffectiveShape(shape: Preview3DShape): EffectiveShape {
  return shape === 'custom' ? 'sphere' : shape
}

export function EmptyMesh({ shape }: { shape: Preview3DShape }) {
  const s = toEffectiveShape(shape)
  return (
    <mesh rotation={[s === 'plane' ? 0 : -0.12, 0.3, s === 'plane' ? 0 : 0.05]}>
      <ShapeGeometry shape={s} />
      <meshStandardMaterial color="#888" />
    </mesh>
  )
}

export function LoadedMesh({
  maps,
  mapDefs,
  materialType,
  shape,
  textureRepeat,
  disabledMaps,
  materialSettings,
}: {
  maps: Record<string, string>
  mapDefs: Array<MapDef>
  materialType: MaterialType
  shape: Preview3DShape
  textureRepeat: number
  disabledMaps: Set<MapKey>
  materialSettings?: StandardMaterialSettings
}) {
  const textures = useTexture(maps) as Record<string, Texture | undefined>
  const s = toEffectiveShape(shape)

  const material = useManagedMaterial({
    materialType,
    textures,
    mapDefs,
    disabledMaps,
    textureRepeat,
    materialSettings,
    doubleSided: s === 'plane',
  })

  return (
    <mesh rotation={[s === 'plane' ? 0 : -0.12, 0.3, s === 'plane' ? 0 : 0.05]}>
      <ShapeGeometry shape={s} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

export function ShapeGeometry({ shape }: { shape: EffectiveShape }) {
  if (shape === 'sphere') return <sphereGeometry args={[1.1, 64, 64]} />
  if (shape === 'cube') return <boxGeometry args={[1.7, 1.7, 1.7]} />
  return <planeGeometry args={[2.6, 2.6]} />
}
