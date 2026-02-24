import { runBlurSharp, runDisplacement, runGrayscale, runInvert } from '../gpu'
import type { GPUImageBuffer } from '@/types/studio'

export async function processDisplacementNode(
  device: GPUDevice,
  input: GPUImageBuffer,
  params: {
    contrast: number
    blurSharp: number
    invert: boolean
  },
): Promise<GPUImageBuffer> {
  const { width, height } = input

  let current = runGrayscale(device, input.buffer, width * height)

  if (params.invert) {
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

  const outputBuffer = runDisplacement(
    device,
    current,
    width,
    height,
    params.contrast,
  )
  current.destroy()

  return { buffer: outputBuffer, width, height }
}
