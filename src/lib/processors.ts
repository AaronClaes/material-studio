// Pure Canvas 2D API image processing functions

export function processInputNode(src: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
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

  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = srcW
  srcCanvas.height = srcH
  const srcCtx = srcCanvas.getContext('2d')!
  srcCtx.putImageData(input, 0, 0)

  const dstCanvas = document.createElement('canvas')
  dstCanvas.width = w
  dstCanvas.height = h
  const dstCtx = dstCanvas.getContext('2d')!
  dstCtx.drawImage(srcCanvas, x, y, w, h, 0, 0, w, h)

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

  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = input.width
  srcCanvas.height = input.height
  const srcCtx = srcCanvas.getContext('2d')!
  srcCtx.putImageData(input, 0, 0)

  const dstCanvas = document.createElement('canvas')
  dstCanvas.width = width
  dstCanvas.height = height
  const dstCtx = dstCanvas.getContext('2d')!
  dstCtx.drawImage(srcCanvas, 0, 0, width, height)

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
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = input.width
  srcCanvas.height = input.height
  const srcCtx = srcCanvas.getContext('2d')!
  srcCtx.putImageData(input, 0, 0)

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

  dstCtx.drawImage(srcCanvas, 0, 0)

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

export function processOutputNode(
  input: ImageData,
  params: { format: 'png' | 'jpg' | 'webp' },
): Promise<{ imageData: ImageData; dataUrl: string }> {
  const canvas = document.createElement('canvas')
  canvas.width = input.width
  canvas.height = input.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(input, 0, 0)

  const mimeMap = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }
  const dataUrl = canvas.toDataURL(mimeMap[params.format])

  return Promise.resolve({ imageData: input, dataUrl })
}

function boxBlur1D(
  data: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  const out = new Float32Array(data.length)
  const r = Math.max(1, Math.round(radius))

  // Horizontal pass
  const tmp = new Float32Array(data.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      let count = 0
      for (let dx = -r; dx <= r; dx++) {
        const sx = Math.max(0, Math.min(width - 1, x + dx))
        sum += data[y * width + sx]
        count++
      }
      tmp[y * width + x] = sum / count
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      let count = 0
      for (let dy = -r; dy <= r; dy++) {
        const sy = Math.max(0, Math.min(height - 1, y + dy))
        sum += tmp[sy * width + x]
        count++
      }
      out[y * width + x] = sum / count
    }
  }

  return out
}

function applyBlurSharp(
  data: Float32Array,
  width: number,
  height: number,
  blurSharp: number,
): Float32Array<ArrayBufferLike> {
  if (blurSharp > 0) {
    let result = data
    for (let i = 0; i < 3; i++) {
      result = boxBlur1D(result, width, height, blurSharp)
    }
    return result
  } else {
    // Unsharp mask: sharpen
    const factor = Math.abs(blurSharp) / 8
    const blurred = boxBlur1D(data, width, height, 1)
    const out = new Float32Array(data.length)
    for (let i = 0; i < data.length; i++) {
      out[i] = Math.max(
        0,
        Math.min(1, data[i] + factor * (data[i] - blurred[i])),
      )
    }
    return out
  }
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
  const src = input.data

  // Convert to grayscale height map via BT.709 luminance
  let heights: Float32Array<ArrayBufferLike> = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = src[i * 4] / 255
    const g = src[i * 4 + 1] / 255
    const b = src[i * 4 + 2] / 255
    heights[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

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

/** Convert ImageData to a full-resolution PNG data URL for display. */
export function imageDataToDataUrl(data: ImageData): string {
  const canvas = document.createElement('canvas')
  canvas.width = data.width
  canvas.height = data.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(data, 0, 0)
  return canvas.toDataURL('image/png')
}
