import { applyBlurSharp, toGrayscaleHeights } from './utils'

export function processDisplacementNode(
  input: ImageData,
  params: {
    contrast: number
    blurSharp: number
    invert: boolean
  },
): Promise<ImageData> {
  const { width, height } = input

  let heights = toGrayscaleHeights(input)

  if (params.invert) {
    for (let i = 0; i < heights.length; i++) {
      heights[i] = 1 - heights[i]
    }
  }

  if (params.blurSharp !== 0) {
    heights = applyBlurSharp(heights, width, height, params.blurSharp)
  }

  const out = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const h = Math.max(
      0,
      Math.min(1, 0.5 + (heights[i] - 0.5) * (1 + params.contrast)),
    )
    const v = Math.round(h * 255)
    out[i * 4] = v
    out[i * 4 + 1] = v
    out[i * 4 + 2] = v
    out[i * 4 + 3] = 255
  }

  return Promise.resolve(new ImageData(out, width, height))
}
