import { imageDataToCanvas } from './utils'

export function processOutputNode(
  input: ImageData,
  params: { format: 'png' | 'jpg' | 'webp' },
): Promise<{ imageData: ImageData; dataUrl: string }> {
  const mimeMap = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }
  const dataUrl = imageDataToCanvas(input).toDataURL(mimeMap[params.format])
  return Promise.resolve({ imageData: input, dataUrl })
}
