import { runColorAdjust } from '../gpu/shaders/color-adjust'
import type { GPUImageBuffer } from '@/types/studio'

export function processColorNode(
  device: GPUDevice,
  input: GPUImageBuffer,
  params: {
    brightness: number
    contrast: number
    saturation: number
    hue: number
    tintColor: string
  },
): Promise<GPUImageBuffer> {
  // Map -100..100 to CSS multiplier: 1 + value/100
  const brightness = 1 + params.brightness / 100
  const contrast = 1 + params.contrast / 100
  const saturation = 1 + params.saturation / 100

  // Parse hex tint #rrggbb to 0-1 floats
  const tint = params.tintColor
  const tintR = parseInt(tint.slice(1, 3), 16) / 255
  const tintG = parseInt(tint.slice(3, 5), 16) / 255
  const tintB = parseInt(tint.slice(5, 7), 16) / 255

  return Promise.resolve(
    runColorAdjust(device, input, {
      brightness,
      contrast,
      saturation,
      hueDeg: params.hue,
      tintR,
      tintG,
      tintB,
    }),
  )
}
