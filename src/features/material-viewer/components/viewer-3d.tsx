import { MultiMapMesh } from './multi-map-mesh'
import type { Preview3DShape } from '@/features/preview/types'
import type {
  MapDef,
  MapKey,
  MaterialType,
  StandardMaterialSettings,
} from '../lib/material-definitions'
import { Preview3DCanvas } from '@/features/preview/components'

interface Viewer3DProps {
  maps: Partial<Record<MapKey, string>>
  mapDefs: Array<MapDef>
  materialType: MaterialType
  shape: Preview3DShape
  textureRepeat: number
  environmentFile: string
  customModelUrl?: string | null
  selectedMaterials?: Array<string>
  disabledMaps: Set<MapKey>
  materialSettings?: StandardMaterialSettings
}

export function Viewer3D({
  maps,
  mapDefs,
  materialType,
  shape,
  textureRepeat,
  environmentFile,
  customModelUrl,
  selectedMaterials,
  disabledMaps,
  materialSettings,
}: Viewer3DProps) {
  return (
    <Preview3DCanvas environmentFile={environmentFile}>
      <MultiMapMesh
        maps={maps}
        mapDefs={mapDefs}
        materialType={materialType}
        shape={shape}
        textureRepeat={textureRepeat}
        customModelUrl={customModelUrl}
        selectedMaterials={selectedMaterials}
        disabledMaps={disabledMaps}
        materialSettings={materialSettings}
      />
    </Preview3DCanvas>
  )
}
