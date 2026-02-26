export type PreviewView = 'image' | '3d'
export type Preview3DShape = 'sphere' | 'cube' | 'plane'

export interface CompareCandidate {
  id: string
  label: string
  dataUrl: string
}

export interface PreviewSettings {
  view: PreviewView
  compareId: string | null
  viewMode: 'split' | 'overlay'
  sliderPos: number
  shape: Preview3DShape
  textureRepeat: number
  repeatEnabled: boolean
  repeatAmount: number
  showGrid: boolean
}

export const DEFAULT_PREVIEW_SETTINGS: PreviewSettings = {
  view: 'image',
  compareId: null,
  viewMode: 'split',
  sliderPos: 50,
  shape: 'sphere',
  textureRepeat: 1,
  repeatEnabled: false,
  repeatAmount: 3,
  showGrid: false,
}
