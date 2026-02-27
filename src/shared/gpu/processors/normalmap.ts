import { runBlurSharp, runGrayscale, runInvert, runNormalmap } from '..'
import type { GPUImageBuffer } from '@/features/workflow/types'

export async function processNormalmapNode(
  device: GPUDevice,
  input: GPUImageBuffer,
  params: {
    strength: number
    level: number
    blurSharp: number
    filter: 'sobel' | 'scharr'
    invertR: boolean
    invertG: boolean
    invertHeight: boolean
    zRange: boolean
  },
): Promise<GPUImageBuffer> {
  const { width, height } = input

  let current = runGrayscale(device, input.buffer, width * height)

  if (params.invertHeight) {
    const inverted = runInvert(device, current, width * height)
    current.destroy()
    current = inverted
  }

  if (params.blurSharp !== 0) {
    const blurred = runBlurSharp(
      device,
      current,
      width,
      height,
      params.blurSharp,
    )
    current.destroy()
    current = blurred
  }

  const outputBuffer = runNormalmap(device, current, width, height, {
    scale: params.strength * params.level,
    invertR: params.invertR,
    invertG: params.invertG,
    zRange: params.zRange,
    useScharr: params.filter === 'scharr',
  })
  current.destroy()

  return { buffer: outputBuffer, width, height }
}
