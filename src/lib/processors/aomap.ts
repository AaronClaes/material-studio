import {
  getGPUDevice,
  runGrayscale,
  runInvert,
  runBlurSharp,
  runAomap,
} from '../gpu'

export async function processAomapNode(
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
  const device = await getGPUDevice()

  const { heightsBuffer, inputBuffer } = runGrayscale(device, input)
  inputBuffer.destroy()

  let current = heightsBuffer

  if (params.blurSharp !== 0) {
    const blurred = runBlurSharp(device, current, width, height, params.blurSharp)
    current.destroy()
    current = blurred
  }

  if (params.invert) {
    const inverted = runInvert(device, current, width * height)
    current.destroy()
    current = inverted
  }

  const radius = params.range * Math.min(width, height) * 0.3

  return runAomap(device, current, width, height, {
    radius,
    strength: params.strength,
    mean: params.mean,
  })
}
