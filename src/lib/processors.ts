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

/** Convert ImageData to a full-resolution PNG data URL for display. */
export function imageDataToDataUrl(data: ImageData): string {
  const canvas = document.createElement('canvas')
  canvas.width = data.width
  canvas.height = data.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(data, 0, 0)
  return canvas.toDataURL('image/png')
}
