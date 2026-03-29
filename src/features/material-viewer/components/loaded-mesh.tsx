import { useEffect, useMemo, useRef } from 'react'
import { useTexture } from '@react-three/drei'
import {
  Color,
  DoubleSide,
  LinearSRGBColorSpace,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
} from 'three'
import type { Material, Texture } from 'three'
import type { Preview3DShape } from '@/features/preview/types'
import type {
  MapDef,
  MapKey,
  MaterialType,
  StandardMaterialSettings,
} from '../lib/material-definitions'

const MATERIAL_CONSTRUCTORS: Record<MaterialType, new () => Material> = {
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
}

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
  const textures = useTexture(maps)
  const texRef = useRef(textures)
  texRef.current = textures
  const s = toEffectiveShape(shape)

  const material = useMemo(() => {
    const mat = new MATERIAL_CONSTRUCTORS[materialType]()
    if (s === 'plane') {
      ;(mat as any).side = DoubleSide
    }
    const currentTextures = texRef.current
    for (const def of mapDefs) {
      if (disabledMaps.has(def.key)) continue
      const tex = (currentTextures as Record<string, Texture | undefined>)[
        def.key
      ]
      if (!tex) continue
      tex.wrapS = RepeatWrapping
      tex.wrapT = RepeatWrapping
      tex.repeat.set(textureRepeat, textureRepeat)
      tex.colorSpace =
        def.colorSpace === 'srgb' ? SRGBColorSpace : LinearSRGBColorSpace
      tex.needsUpdate = true
      ;(mat as any)[def.key] = tex
    }
    if (materialType === 'MeshStandardMaterial' && materialSettings) {
      const stdMat = mat as MeshStandardMaterial
      stdMat.roughness = materialSettings.roughness
      stdMat.metalness = materialSettings.metalness
      stdMat.color = new Color(materialSettings.color)
      stdMat.emissive = new Color(materialSettings.emissive)
      stdMat.emissiveIntensity = materialSettings.emissiveIntensity
      stdMat.aoMapIntensity = materialSettings.aoMapIntensity
      stdMat.displacementScale = materialSettings.displacementScale
      stdMat.displacementBias = materialSettings.displacementBias
      stdMat.normalScale = new Vector2(
        materialSettings.normalScale,
        materialSettings.normalScale,
      )
      stdMat.wireframe = materialSettings.wireframe
      stdMat.flatShading = materialSettings.flatShading
    }
    mat.needsUpdate = true
    return mat
  }, [
    maps,
    materialType,
    mapDefs,
    textureRepeat,
    s,
    disabledMaps,
    materialSettings,
  ])

  useEffect(() => () => material.dispose(), [material])

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

export { MATERIAL_CONSTRUCTORS }
