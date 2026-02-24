import { imageDataToGPUBuffer } from '../gpu/gpu-image'
import { loadImageAsImageData } from './utils'
import type { GPUImageBuffer } from '@/types/studio'

export async function processInputNode(
  device: GPUDevice,
  src: string,
): Promise<GPUImageBuffer> {
  const imageData = await loadImageAsImageData(src)
  return imageDataToGPUBuffer(device, imageData)
}

export async function dataUrlToGPUBuffer(
  device: GPUDevice,
  dataUrl: string,
): Promise<GPUImageBuffer> {
  const imageData = await loadImageAsImageData(dataUrl)
  return imageDataToGPUBuffer(device, imageData)
}
