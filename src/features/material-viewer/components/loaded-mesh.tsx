import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import {
  DoubleSide,
  LinearSRGBColorSpace,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import type { Material, Texture } from 'three'
import type { Preview3DShape } from '@/features/preview/types'
import type { MapDef, MaterialType } from '../lib/material-definitions'

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

export function ShapeGeometry({ shape }: { shape: EffectiveShape }) {
  if (shape === 'sphere') return <sphereGeometry args={[1.1, 64, 64]} />
  if (shape === 'cube') return <boxGeometry args={[1.7, 1.7, 1.7]} />
  return <planeGeometry args={[2.6, 2.6]} />
}

export { MATERIAL_CONSTRUCTORS }
