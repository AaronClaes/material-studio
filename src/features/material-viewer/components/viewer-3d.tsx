import type { Preview3DShape } from '@/features/preview/types'
import type { MapDef, MapKey, MaterialType } from '../lib/material-definitions'
import { Preview3DCanvas } from '@/features/preview/components'
import { MultiMapMesh } from './multi-map-mesh'

interface Viewer3DProps {
  maps: Partial<Record<MapKey, string>>
  mapDefs: Array<MapDef>
  materialType: MaterialType
  shape: Preview3DShape
  textureRepeat: number
  environmentFile: string
  customModelUrl?: string | null
  selectedMaterials?: Array<string>
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
      />
    </Preview3DCanvas>
  )
}
