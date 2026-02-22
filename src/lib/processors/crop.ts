import { imageDataToCanvas } from './utils'

export function processCropNode(
  input: ImageData,
  params: { x: number; y: number; width: number; height: number },
): Promise<ImageData> {
  const srcW = input.width
  const srcH = input.height

  const x = Math.max(0, Math.min(params.x, srcW - 1))
  const y = Math.max(0, Math.min(params.y, srcH - 1))
  const w = Math.max(1, Math.min(params.width, srcW - x))
  const h = Math.max(1, Math.min(params.height, srcH - y))

  const dstCanvas = document.createElement('canvas')
  dstCanvas.width = w
  dstCanvas.height = h
  const dstCtx = dstCanvas.getContext('2d')!
  dstCtx.drawImage(imageDataToCanvas(input), x, y, w, h, 0, 0, w, h)

  return Promise.resolve(dstCtx.getImageData(0, 0, w, h))
}
