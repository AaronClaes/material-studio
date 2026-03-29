import { useEffect, useRef } from 'react'
import { DoubleSide } from 'three'
import {
  applyMaterialSettings,
  applyTextures,
  createMaterial,
} from '../lib/material-utils'
import type { Material, Texture } from 'three'
import type {
  MapDef,
  MapKey,
  MaterialType,
  StandardMaterialSettings,
} from '../lib/material-definitions'

export function useManagedMaterial({
  materialType,
  textures,
  mapDefs,
  disabledMaps,
  textureRepeat,
  materialSettings,
  doubleSided,
}: {
  materialType: MaterialType
  textures: Record<string, Texture | undefined>
  mapDefs: Array<MapDef>
  disabledMaps: Set<MapKey>
  textureRepeat: number
  materialSettings?: StandardMaterialSettings
  doubleSided?: boolean
}): Material {
  const matRef = useRef<Material | null>(null)
  const prevTypeRef = useRef<MaterialType>(materialType)

  if (matRef.current === null || materialType !== prevTypeRef.current) {
    matRef.current?.dispose()
    matRef.current = createMaterial(materialType)
    prevTypeRef.current = materialType
  }

  const mat = matRef.current

  if (doubleSided) {
    ;(mat as any).side = DoubleSide
  }

  applyTextures(mat, textures, mapDefs, disabledMaps, textureRepeat)
  applyMaterialSettings(mat, materialType, materialSettings)
  mat.needsUpdate = true

  useEffect(
    () => () => {
      matRef.current?.dispose()
    },
    [],
  )

  return mat
}
