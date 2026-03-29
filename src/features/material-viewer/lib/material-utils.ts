import {
  Color,
  LinearSRGBColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
} from 'three'
import { MATERIAL_CONSTRUCTORS } from './material-definitions'
import type { Material, MeshStandardMaterial, Texture } from 'three'
import type {
  MapDef,
  MapKey,
  MaterialType,
  StandardMaterialSettings,
} from './material-definitions'

export function createMaterial(type: MaterialType): Material {
  return new MATERIAL_CONSTRUCTORS[type]()
}

export function applyTextures(
  material: Material,
  textures: Record<string, Texture | undefined>,
  mapDefs: Array<MapDef>,
  disabledMaps: Set<MapKey>,
  textureRepeat: number,
): void {
  for (const def of mapDefs) {
    if (disabledMaps.has(def.key)) {
      ;(material as any)[def.key] = null
      continue
    }
    const tex = textures[def.key]
    if (!tex) {
      ;(material as any)[def.key] = null
      continue
    }
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.repeat.set(textureRepeat, textureRepeat)
    tex.colorSpace =
      def.colorSpace === 'srgb' ? SRGBColorSpace : LinearSRGBColorSpace
    tex.needsUpdate = true
    ;(material as any)[def.key] = tex
  }
}

export function applyMaterialSettings(
  material: Material,
  materialType: MaterialType,
  settings: StandardMaterialSettings | undefined,
): void {
  if (materialType !== 'MeshStandardMaterial' || !settings) return
  const mat = material as MeshStandardMaterial
  mat.roughness = settings.roughness
  mat.metalness = settings.metalness
  mat.color = new Color(settings.color)
  mat.emissive = new Color(settings.emissive)
  mat.emissiveIntensity = settings.emissiveIntensity
  mat.aoMapIntensity = settings.aoMapIntensity
  mat.displacementScale = settings.displacementScale
  mat.displacementBias = settings.displacementBias
  mat.normalScale = new Vector2(settings.normalScale, settings.normalScale)
  mat.wireframe = settings.wireframe
  mat.flatShading = settings.flatShading
}
