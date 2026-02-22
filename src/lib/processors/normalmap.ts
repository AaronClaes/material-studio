import { applyBlurSharp, toGrayscaleHeights } from './utils'

export function processNormalmapNode(
  input: ImageData,
  params: {
    strength: number
    level: number
    blurSharp: number
    filter: 'sobel' | 'scharr'
    invertR: boolean
    invertG: boolean
    invertHeight: boolean
    zRange: boolean
  },
): Promise<ImageData> {
  const { width, height } = input

  let heights = toGrayscaleHeights(input)

  if (params.invertHeight) {
    for (let i = 0; i < heights.length; i++) {
      heights[i] = 1 - heights[i]
    }
  }

  if (params.blurSharp !== 0) {
    heights = applyBlurSharp(heights, width, height, params.blurSharp)
  }

  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ]
  const sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ]
  const scharrX = [
    [-3, 0, 3],
    [-10, 0, 10],
    [-3, 0, 3],
  ]
  const scharrY = [
    [-3, -10, -3],
    [0, 0, 0],
    [3, 10, 3],
  ]
  const kX = params.filter === 'scharr' ? scharrX : sobelX
  const kY = params.filter === 'scharr' ? scharrY : sobelY

  const scale = params.strength * params.level
  const out = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dX = 0
      let dY = 0
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const sx = Math.max(0, Math.min(width - 1, x + kx - 1))
          const sy = Math.max(0, Math.min(height - 1, y + ky - 1))
          const h = heights[sy * width + sx]
          dX += h * kX[ky][kx]
          dY += h * kY[ky][kx]
        }
      }

      // Compute normal and normalize
      let nx = -dX * scale
      let ny = -dY * scale
      let nz = 1.0
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
      nx /= len
      ny /= len
      nz /= len

      if (params.invertR) nx = -nx
      if (params.invertG) ny = -ny

      const idx = (y * width + x) * 4
      out[idx] = Math.round(((nx + 1) / 2) * 255)
      out[idx + 1] = Math.round(((ny + 1) / 2) * 255)
      out[idx + 2] = params.zRange
        ? Math.round(((nz + 1) / 2) * 255)
        : Math.round(nz * 127 + 128)
      out[idx + 3] = 255
    }
  }

  return Promise.resolve(new ImageData(out, width, height))
}
