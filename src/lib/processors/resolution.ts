import { imageDataToCanvas } from './utils'

export function processResolutionNode(
  input: ImageData,
  params: { width: number; height: number; maintainAspect: boolean },
): Promise<ImageData> {
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

  const dstCanvas = document.createElement('canvas')
  dstCanvas.width = width
  dstCanvas.height = height
  const dstCtx = dstCanvas.getContext('2d')!
  dstCtx.drawImage(imageDataToCanvas(input), 0, 0, width, height)

  return Promise.resolve(dstCtx.getImageData(0, 0, width, height))
}
