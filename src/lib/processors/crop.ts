import { runCrop } from '../gpu/shaders/crop'
import type { GPUImageBuffer } from '@/types/studio'

export function processCropNode(
  device: GPUDevice,
  input: GPUImageBuffer,
  params: { x: number; y: number; width: number; height: number },
): Promise<GPUImageBuffer> {
  return Promise.resolve(runCrop(device, input, params))
}
