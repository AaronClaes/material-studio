import { applyBlurSharp, toGrayscaleHeights } from './utils'

export function processAomapNode(
  input: ImageData,
  params: {
    strength: number
    mean: number
    range: number
    blurSharp: number
    invert: boolean
  },
): Promise<ImageData> {
  const { width, height } = input

  let heights = toGrayscaleHeights(input)

  if (params.blurSharp !== 0) {
    heights = applyBlurSharp(heights, width, height, params.blurSharp)
  }

  if (params.invert) {
    for (let i = 0; i < heights.length; i++) {
      heights[i] = 1 - heights[i]
    }
  }

  const radius = params.range * Math.min(width, height) * 0.3
  const RAY_COUNT = 16
  const out = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerH = heights[y * width + x]
      let occluded = 0

      for (let r = 0; r < RAY_COUNT; r++) {
        const angle = (r / RAY_COUNT) * Math.PI * 2
        const sx = Math.max(
          0,
          Math.min(width - 1, Math.round(x + Math.cos(angle) * radius)),
        )
        const sy = Math.max(
          0,
          Math.min(height - 1, Math.round(y + Math.sin(angle) * radius)),
        )
        if (heights[sy * width + sx] > centerH) occluded++
      }

      let ao = 1 - (occluded / RAY_COUNT) * params.strength
      ao = Math.max(0, Math.min(1, ao + (params.mean - 0.5)))
      const v = Math.round(ao * 255)
      const idx = (y * width + x) * 4
      out[idx] = v
      out[idx + 1] = v
      out[idx + 2] = v
      out[idx + 3] = 255
    }
  }

  return Promise.resolve(new ImageData(out, width, height))
}
