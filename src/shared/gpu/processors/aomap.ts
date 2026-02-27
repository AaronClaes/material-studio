import { runAomap, runBlurSharp, runGrayscale, runInvert } from '..'
import type { GPUImageBuffer } from '@/features/workflow/types'

export async function processAomapNode(
  device: GPUDevice,
  input: GPUImageBuffer,
  params: {
    strength: number
    mean: number
    range: number
    blurSharp: number
    invert: boolean
  },
): Promise<GPUImageBuffer> {
  const { width, height } = input

  let current = runGrayscale(device, input.buffer, width * height)

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

  if (params.invert) {
    const inverted = runInvert(device, current, width * height)
    current.destroy()
    current = inverted
  }

  const radius = params.range * Math.min(width, height) * 0.3

  const outputBuffer = runAomap(device, current, width, height, {
    radius,
    strength: params.strength,
    mean: params.mean,
  })
  current.destroy()

  return { buffer: outputBuffer, width, height }
}
