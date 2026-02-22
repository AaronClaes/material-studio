// Shared utility functions for image processing

export function loadImageAsImageData(src: string): Promise<ImageData> {
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

export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

export function toGrayscaleHeights(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData
  const heights = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4] / 255
    const g = data[i * 4 + 1] / 255
    const b = data[i * 4 + 2] / 255
    heights[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b // See ITU-R BT.709 standard
  }
  return heights
}

export function boxBlur1D(
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

export function applyBlurSharp(
  data: Float32Array,
  width: number,
  height: number,
  blurSharp: number,
): Float32Array {
  if (blurSharp < 0) {
    let result = data
    for (let i = 0; i < 3; i++) {
      result = boxBlur1D(result, width, height, Math.abs(blurSharp))
    }
    return result
  } else {
    // Unsharp mask: sharpen
    const factor = blurSharp / 8
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

/** Convert ImageData to a full-resolution PNG data URL for display. */
export function imageDataToDataUrl(data: ImageData): string {
  return imageDataToCanvas(data).toDataURL('image/png')
}
