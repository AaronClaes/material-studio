import { runResize } from '../gpu/shaders/resize'
import type { GPUImageBuffer } from '@/types/studio'

export function processResolutionNode(
  device: GPUDevice,
  input: GPUImageBuffer,
  params: { width: number; height: number; maintainAspect: boolean },
): Promise<GPUImageBuffer> {
  let { width, height } = params

  if (params.maintainAspect) {
    const aspect = input.width / input.height
    if (width / height > aspect) {
      width = Math.round(height * aspect)
    } else {
      height = Math.round(width / aspect)
    }
  }

  width = Math.max(1, width)
  height = Math.max(1, height)

  return Promise.resolve(runResize(device, input, width, height))
}
