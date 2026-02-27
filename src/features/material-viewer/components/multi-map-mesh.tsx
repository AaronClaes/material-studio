import type { Preview3DShape } from '@/features/preview/types'
import type { MapDef, MapKey, MaterialType } from '../lib/material-definitions'
import { EmptyMesh, LoadedMesh } from './loaded-mesh'
import { CustomModelMesh } from './custom-model-mesh'

export function MultiMapMesh({
  maps,
  mapDefs,
  materialType,
  shape,
  textureRepeat,
  customModelUrl,
  selectedMaterials,
}: {
  maps: Partial<Record<MapKey, string | null>>
  mapDefs: Array<MapDef>
  materialType: MaterialType
  shape: Preview3DShape
  textureRepeat: number
  customModelUrl?: string | null
  selectedMaterials?: Array<string>
}) {
  const nonNullMaps = Object.fromEntries(
    Object.entries(maps).filter(([, v]) => v != null),
  ) as Record<string, string>

  if (shape === 'custom' && customModelUrl) {
    return (
      <CustomModelMesh
        modelUrl={customModelUrl}
        maps={nonNullMaps}
        mapDefs={mapDefs}
        materialType={materialType}
        textureRepeat={textureRepeat}
        selectedMaterials={selectedMaterials ?? []}
      />
    )
  }

  const hasAny = Object.keys(nonNullMaps).length > 0

  if (!hasAny) {
    return <EmptyMesh shape={shape} />
  }

  return (
    <LoadedMesh
      maps={nonNullMaps}
      mapDefs={mapDefs}
      materialType={materialType}
      shape={shape}
      textureRepeat={textureRepeat}
    />
  )
}
