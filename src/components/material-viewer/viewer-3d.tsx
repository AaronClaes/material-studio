import { useEffect, useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import {
  DoubleSide,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import type { Material, Texture } from 'three'
import type { Preview3DShape } from '@/components/studio/preview/types'
import type { MapDef, MapKey, MaterialType } from './material-definitions'
import { Preview3DCanvas } from '@/components/studio/preview'

const MATERIAL_CONSTRUCTORS: Record<MaterialType, new () => Material> = {
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
}

type EffectiveShape = Exclude<Preview3DShape, 'custom'>

function toEffectiveShape(shape: Preview3DShape): EffectiveShape {
  return shape === 'custom' ? 'sphere' : shape
}

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

function MultiMapMesh({
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

// Dispatcher — splits to avoid calling useTexture conditionally
function CustomModelMesh({
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

function EmptyMesh({ shape }: { shape: Preview3DShape }) {
  const s = toEffectiveShape(shape)
  return (
    <mesh rotation={[s === 'plane' ? 0 : -0.12, 0.3, s === 'plane' ? 0 : 0.05]}>
      <ShapeGeometry shape={s} />
      <meshStandardMaterial color="#888" />
    </mesh>
  )
}

function LoadedMesh({
  maps,
  mapDefs,
  materialType,
  shape,
  textureRepeat,
}: {
  maps: Record<string, string>
  mapDefs: Array<MapDef>
  materialType: MaterialType
  shape: Preview3DShape
  textureRepeat: number
}) {
  const textures = useTexture(maps)
  const s = toEffectiveShape(shape)

  const material = useMemo(() => {
    const mat = new MATERIAL_CONSTRUCTORS[materialType]()
    if (s === 'plane') {
      ;(mat as any).side = DoubleSide
    }
    for (const def of mapDefs) {
      const tex = (textures as Record<string, Texture | undefined>)[def.key]
      if (!tex) continue
      tex.wrapS = RepeatWrapping
      tex.wrapT = RepeatWrapping
      tex.repeat.set(textureRepeat, textureRepeat)
      tex.colorSpace =
        def.colorSpace === 'srgb' ? SRGBColorSpace : LinearSRGBColorSpace
      tex.needsUpdate = true
      ;(mat as any)[def.key] = tex
    }
    mat.needsUpdate = true
    return mat
  }, [textures, materialType, mapDefs, textureRepeat, s])

  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh rotation={[s === 'plane' ? 0 : -0.12, 0.3, s === 'plane' ? 0 : 0.05]}>
      <ShapeGeometry shape={s} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

function ShapeGeometry({ shape }: { shape: EffectiveShape }) {
  if (shape === 'sphere') return <sphereGeometry args={[1.1, 64, 64]} />
  if (shape === 'cube') return <boxGeometry args={[1.7, 1.7, 1.7]} />
  return <planeGeometry args={[2.6, 2.6]} />
}
