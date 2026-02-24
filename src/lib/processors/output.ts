import { gpuBufferToObjectUrl } from '../gpu/preview'
import type { GPUImageBuffer } from '@/types/studio'

export async function processOutputNode(
  device: GPUDevice,
  input: GPUImageBuffer,
  params: { format: 'png' | 'jpg' | 'webp' },
): Promise<{ gpuBuffer: GPUImageBuffer; dataUrl: string }> {
  const mimeMap = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }
  const dataUrl = await gpuBufferToObjectUrl(
    device,
    input,
    mimeMap[params.format],
  )
  return { gpuBuffer: input, dataUrl }
}
