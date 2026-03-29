import { useEffect, useMemo, useRef } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { Mesh } from 'three'
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

export function CustomModelMesh({
  modelUrl,
  maps,
  mapDefs,
  materialType,
  textureRepeat,
  selectedMaterials,
  disabledMaps,
  materialSettings,
}: {
  modelUrl: string
  maps: Record<string, string>
  mapDefs: Array<MapDef>
  materialType: MaterialType
  textureRepeat: number
  selectedMaterials: Array<string>
  disabledMaps: Set<MapKey>
  materialSettings?: StandardMaterialSettings
}) {
  const hasAny = Object.keys(maps).length > 0
  if (hasAny) {
    return (
      <CustomModelLoadedMesh
        modelUrl={modelUrl}
        maps={maps}
        mapDefs={mapDefs}
        materialType={materialType}
        textureRepeat={textureRepeat}
        selectedMaterials={selectedMaterials}
        disabledMaps={disabledMaps}
        materialSettings={materialSettings}
      />
    )
  }
  return <CustomModelEmptyMesh modelUrl={modelUrl} />
}

function CustomModelEmptyMesh({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl)
  const clonedScene = useMemo(() => scene.clone(true), [scene])
  return (
    <group>
      <primitive object={clonedScene} />
    </group>
  )
}

function CustomModelLoadedMesh({
  modelUrl,
  maps,
  mapDefs,
  materialType,
  textureRepeat,
  selectedMaterials,
  disabledMaps,
  materialSettings,
}: {
  modelUrl: string
  maps: Record<string, string>
  mapDefs: Array<MapDef>
  materialType: MaterialType
  textureRepeat: number
  selectedMaterials: Array<string>
  disabledMaps: Set<MapKey>
  materialSettings?: StandardMaterialSettings
}) {
  const { scene } = useGLTF(modelUrl)
  const textures = useTexture(maps)
  const texRef = useRef(textures)
  texRef.current = textures

  const { clonedScene, originalMaterials } = useMemo(() => {
    const clone = scene.clone(true)
    const originals = new Map<Mesh, Material | Array<Material>>()
    clone.traverse((child) => {
      if (child instanceof Mesh) {
        originals.set(
          child,
          Array.isArray(child.material)
            ? child.material.map((m: Material) => m.clone())
            : child.material.clone(),
        )
      }
    })
    return { clonedScene: clone, originalMaterials: originals }
  }, [scene])

  useEffect(() => {
    const currentTextures = texRef.current as Record<
      string,
      Texture | undefined
    >
    const selectedSet = new Set(selectedMaterials)
    clonedScene.traverse((child) => {
      if (!(child instanceof Mesh)) return
      const origMat = originalMaterials.get(child)
      if (!origMat) return
      const originals = Array.isArray(origMat) ? origMat : [origMat]

      const newMaterials = originals.map((mat, i) => {
        const matName = mat.name || `Material ${i}`
        if (selectedSet.has(matName)) {
          const newMat = createMaterial(materialType)
          applyTextures(
            newMat,
            currentTextures,
            mapDefs,
            disabledMaps,
            textureRepeat,
          )
          applyMaterialSettings(newMat, materialType, materialSettings)
          newMat.name = matName
          newMat.needsUpdate = true
          return newMat
        }
        return mat.clone()
      })

      child.material = Array.isArray(origMat) ? newMaterials : newMaterials[0]
    })
  }, [
    clonedScene,
    originalMaterials,
    maps,
    materialType,
    mapDefs,
    textureRepeat,
    selectedMaterials,
    disabledMaps,
    materialSettings,
  ])

  return (
    <group>
      <primitive object={clonedScene} />
    </group>
  )
}
