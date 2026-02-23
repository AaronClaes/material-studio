import {
  getGPUDevice,
  runBlurSharp,
  runGrayscale,
  runInvert,
  runNormalmap,
} from '../gpu'

export async function processNormalmapNode(
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
  const device = await getGPUDevice()

  const { heightsBuffer, inputBuffer } = runGrayscale(device, input)
  inputBuffer.destroy()

  let current = heightsBuffer

  if (params.invertHeight) {
    const inverted = runInvert(device, current, width * height)
    current.destroy()
    current = inverted
  }

  if (params.blurSharp !== 0) {
    const blurred = runBlurSharp(
      device,
      current,
      width,
      height,
      params.blurSharp,
    )
    current.destroy()
    current = blurred
  }

  return runNormalmap(device, current, width, height, {
    scale: params.strength * params.level,
    invertR: params.invertR,
    invertG: params.invertG,
    zRange: params.zRange,
    useScharr: params.filter === 'scharr',
  })
}
