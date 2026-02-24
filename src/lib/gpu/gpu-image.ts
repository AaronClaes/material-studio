import { uploadImageData } from './buffers'
import type { GPUImageBuffer } from '@/types/studio'

export function imageDataToGPUBuffer(
  device: GPUDevice,
  imageData: ImageData,
): GPUImageBuffer {
  return {
    buffer: uploadImageData(device, imageData),
    width: imageData.width,
    height: imageData.height,
  }
}

export function destroyGPUImageBuffer(img: GPUImageBuffer): void {
  img.buffer.destroy()
}
