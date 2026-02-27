import { useEffect, useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import {
  LinearSRGBColorSpace,
  Mesh,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import type { Material, Texture } from 'three'
import type { MapDef, MaterialType } from '../lib/material-definitions'
import { MATERIAL_CONSTRUCTORS } from './loaded-mesh'

export function CustomModelMesh({
  modelUrl,
  maps,
  mapDefs,
  materialType,
  textureRepeat,
  selectedMaterials,
}: {
  modelUrl: string
  maps: Record<string, string>
  mapDefs: Array<MapDef>
  materialType: MaterialType
  textureRepeat: number
  selectedMaterials: Array<string>
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
}: {
  modelUrl: string
  maps: Record<string, string>
  mapDefs: Array<MapDef>
  materialType: MaterialType
  textureRepeat: number
  selectedMaterials: Array<string>
}) {
  const { scene } = useGLTF(modelUrl)
  const textures = useTexture(maps)

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
    const selectedSet = new Set(selectedMaterials)
    clonedScene.traverse((child) => {
      if (!(child instanceof Mesh)) return
      const origMat = originalMaterials.get(child)
      if (!origMat) return
      const originals = Array.isArray(origMat) ? origMat : [origMat]

      const newMaterials = originals.map((mat, i) => {
        const matName = mat.name || `Material ${i}`
        if (selectedSet.has(matName)) {
          const newMat = new MATERIAL_CONSTRUCTORS[materialType]()
          for (const def of mapDefs) {
            const tex = (textures as Record<string, Texture | undefined>)[
              def.key
            ]
            if (!tex) continue
            tex.wrapS = RepeatWrapping
            tex.wrapT = RepeatWrapping
            tex.repeat.set(textureRepeat, textureRepeat)
            tex.colorSpace =
              def.colorSpace === 'srgb' ? SRGBColorSpace : LinearSRGBColorSpace
            tex.needsUpdate = true
            ;(newMat as any)[def.key] = tex
          }
          ;(newMat as any).name = matName
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
    textures,
    materialType,
    mapDefs,
    textureRepeat,
    selectedMaterials,
  ])

  return (
    <group>
      <primitive object={clonedScene} />
    </group>
  )
}
