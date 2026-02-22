import { imageDataToCanvas } from './utils'

export function processColorNode(
  input: ImageData,
  params: {
    brightness: number
    contrast: number
    saturation: number
    hue: number
    tintColor: string
  },
): Promise<ImageData> {
  const dstCanvas = document.createElement('canvas')
  dstCanvas.width = input.width
  dstCanvas.height = input.height
  const dstCtx = dstCanvas.getContext('2d')!

  // Map -100..100 to CSS filter values
  const brightness = 1 + params.brightness / 100
  const contrast = 1 + params.contrast / 100
  const saturation = 1 + params.saturation / 100
  const hue = params.hue

  dstCtx.filter = [
    `brightness(${brightness})`,
    `contrast(${contrast})`,
    `saturate(${saturation})`,
    `hue-rotate(${hue}deg)`,
  ].join(' ')

  dstCtx.drawImage(imageDataToCanvas(input), 0, 0)

  // Apply tint color multiplication — like Three.js material color.
  // #ffffff means no tint (multiply by 1). Any other color shifts the hues.
  const tint = params.tintColor
  if (tint.toLowerCase() !== '#ffffff') {
    const r = parseInt(tint.slice(1, 3), 16) / 255
    const g = parseInt(tint.slice(3, 5), 16) / 255
    const b = parseInt(tint.slice(5, 7), 16) / 255
    const imageData = dstCtx.getImageData(
      0,
      0,
      dstCanvas.width,
      dstCanvas.height,
    )
    const d = imageData.data
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.round(d[i] * r)
      d[i + 1] = Math.round(d[i + 1] * g)
      d[i + 2] = Math.round(d[i + 2] * b)
    }
    dstCtx.putImageData(imageData, 0, 0)
  }

  return Promise.resolve(
    dstCtx.getImageData(0, 0, dstCanvas.width, dstCanvas.height),
  )
}
