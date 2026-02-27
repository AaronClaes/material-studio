export type MaterialType =
  | 'MeshBasicMaterial'
  | 'MeshLambertMaterial'
  | 'MeshPhongMaterial'
  | 'MeshStandardMaterial'
  | 'MeshPhysicalMaterial'

export const MATERIAL_TYPES: Array<MaterialType> = [
  'MeshBasicMaterial',
  'MeshLambertMaterial',
  'MeshPhongMaterial',
  'MeshStandardMaterial',
  'MeshPhysicalMaterial',
]

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  MeshBasicMaterial: 'Basic',
  MeshLambertMaterial: 'Lambert',
  MeshPhongMaterial: 'Phong',
  MeshStandardMaterial: 'Standard',
  MeshPhysicalMaterial: 'Physical',
}

export type MapKey =
  | 'map'
  | 'aoMap'
  | 'alphaMap'
  | 'lightMap'
  | 'emissiveMap'
  | 'normalMap'
  | 'displacementMap'
  | 'specularMap'
  | 'roughnessMap'
  | 'metalnessMap'
  | 'envMap'
  | 'clearcoatMap'
  | 'clearcoatNormalMap'
  | 'clearcoatRoughnessMap'
  | 'transmissionMap'
  | 'thicknessMap'
  | 'sheenColorMap'
  | 'sheenRoughnessMap'
  | 'iridescenceMap'

export interface MapDef {
  key: MapKey
  label: string
  colorSpace: 'srgb' | 'linear'
}

const SRGB_KEYS = new Set<MapKey>(['map', 'emissiveMap', 'sheenColorMap'])

function d(key: MapKey, label: string): MapDef {
  return { key, label, colorSpace: SRGB_KEYS.has(key) ? 'srgb' : 'linear' }
}

const M: Record<MapKey, MapDef> = {
  map: d('map', 'Albedo'),
  aoMap: d('aoMap', 'AO'),
  alphaMap: d('alphaMap', 'Alpha'),
  lightMap: d('lightMap', 'Light'),
  emissiveMap: d('emissiveMap', 'Emissive'),
  normalMap: d('normalMap', 'Normal'),
  displacementMap: d('displacementMap', 'Displacement'),
  specularMap: d('specularMap', 'Specular'),
  roughnessMap: d('roughnessMap', 'Roughness'),
  metalnessMap: d('metalnessMap', 'Metalness'),
  envMap: d('envMap', 'Environment'),
  clearcoatMap: d('clearcoatMap', 'Clearcoat'),
  clearcoatNormalMap: d('clearcoatNormalMap', 'Clearcoat Normal'),
  clearcoatRoughnessMap: d('clearcoatRoughnessMap', 'Clearcoat Rough.'),
  transmissionMap: d('transmissionMap', 'Transmission'),
  thicknessMap: d('thicknessMap', 'Thickness'),
  sheenColorMap: d('sheenColorMap', 'Sheen Color'),
  sheenRoughnessMap: d('sheenRoughnessMap', 'Sheen Rough.'),
  iridescenceMap: d('iridescenceMap', 'Iridescence'),
}

export const MATERIAL_MAPS: Record<MaterialType, Array<MapDef>> = {
  MeshBasicMaterial: [M.map, M.aoMap, M.alphaMap, M.lightMap],
  MeshLambertMaterial: [M.map, M.aoMap, M.emissiveMap, M.lightMap, M.alphaMap],
  MeshPhongMaterial: [
    M.map,
    M.normalMap,
    M.displacementMap,
    M.specularMap,
    M.emissiveMap,
    M.aoMap,
    M.alphaMap,
    M.envMap,
    M.lightMap,
  ],
  MeshStandardMaterial: [
    M.map,
    M.normalMap,
    M.roughnessMap,
    M.metalnessMap,
    M.aoMap,
    M.displacementMap,
    M.emissiveMap,
    M.alphaMap,
  ],
  MeshPhysicalMaterial: [
    M.map,
    M.normalMap,
    M.roughnessMap,
    M.metalnessMap,
    M.aoMap,
    M.displacementMap,
    M.emissiveMap,
    M.alphaMap,
    M.clearcoatMap,
    M.clearcoatNormalMap,
    M.clearcoatRoughnessMap,
    M.transmissionMap,
    M.thicknessMap,
    M.sheenColorMap,
    M.sheenRoughnessMap,
    M.iridescenceMap,
  ],
}
