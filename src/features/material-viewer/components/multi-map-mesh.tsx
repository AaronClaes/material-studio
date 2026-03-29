import { useMemo } from 'react'
import { EmptyMesh, LoadedMesh } from './loaded-mesh'
import { CustomModelMesh } from './custom-model-mesh'
import type { Preview3DShape } from '@/features/preview/types'
import type {
  MapDef,
  MapKey,
  MaterialType,
  StandardMaterialSettings,
} from '../lib/material-definitions'

export function MultiMapMesh({
  maps,
  mapDefs,
  materialType,
  shape,
  textureRepeat,
  customModelUrl,
  selectedMaterials,
  disabledMaps,
  materialSettings,
}: {
  maps: Partial<Record<MapKey, string | null>>
  mapDefs: Array<MapDef>
  materialType: MaterialType
  shape: Preview3DShape
  textureRepeat: number
  customModelUrl?: string | null
  selectedMaterials?: Array<string>
  disabledMaps: Set<MapKey>
  materialSettings?: StandardMaterialSettings
}) {
  const nonNullMaps = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(maps).filter(([, v]) => v != null),
      ) as Record<string, string>,
    [maps],
  )

  if (shape === 'custom' && customModelUrl) {
    return (
      <CustomModelMesh
        modelUrl={customModelUrl}
        maps={nonNullMaps}
        mapDefs={mapDefs}
        materialType={materialType}
        textureRepeat={textureRepeat}
        selectedMaterials={selectedMaterials ?? []}
        disabledMaps={disabledMaps}
        materialSettings={materialSettings}
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
      disabledMaps={disabledMaps}
      materialSettings={materialSettings}
    />
  )
}
