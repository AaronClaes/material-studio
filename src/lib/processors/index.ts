// Pure Canvas 2D API image processing functions

import {
  applyBlurSharp,
  imageDataToCanvas,
  imageDataToDataUrl,
  loadImageAsImageData,
  toGrayscaleHeights,
} from './utils'

export { imageDataToDataUrl }

export function processInputNode(src: string): Promise<ImageData> {
  return loadImageAsImageData(src)
}

export function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
  return loadImageAsImageData(dataUrl)
}

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
    const imageData = dstCtx.getImageData(0, 0, dstCanvas.width, dstCanvas.height)
    const d = imageData.data
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.round(d[i] * r)
      d[i + 1] = Math.round(d[i + 1] * g)
      d[i + 2] = Math.round(d[i + 2] * b)
    }
    dstCtx.putImageData(imageData, 0, 0)
  }

  return Promise.resolve(dstCtx.getImageData(0, 0, dstCanvas.width, dstCanvas.height))
}

export function processOutputNode(
  input: ImageData,
  params: { format: 'png' | 'jpg' | 'webp' },
): Promise<{ imageData: ImageData; dataUrl: string }> {
  const mimeMap = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }
  const dataUrl = imageDataToCanvas(input).toDataURL(mimeMap[params.format])
  return Promise.resolve({ imageData: input, dataUrl })
}

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
    const h = Math.max(0, Math.min(1, 0.5 + (heights[i] - 0.5) * (1 + params.contrast)))
    const v = Math.round(h * 255)
    out[i * 4] = v
    out[i * 4 + 1] = v
    out[i * 4 + 2] = v
    out[i * 4 + 3] = 255
  }

  return Promise.resolve(new ImageData(out, width, height))
}

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
        const sx = Math.max(0, Math.min(width - 1, Math.round(x + Math.cos(angle) * radius)))
        const sy = Math.max(0, Math.min(height - 1, Math.round(y + Math.sin(angle) * radius)))
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
