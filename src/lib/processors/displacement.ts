import {
  getGPUDevice,
  runBlurSharp,
  runDisplacement,
  runGrayscale,
  runInvert,
} from '../gpu'

export async function processDisplacementNode(
  input: ImageData,
  params: {
    contrast: number
    blurSharp: number
    invert: boolean
  },
): Promise<ImageData> {
  const { width, height } = input
  const device = await getGPUDevice()

  const { heightsBuffer, inputBuffer } = runGrayscale(device, input)
  inputBuffer.destroy()

  let current = heightsBuffer

  if (params.invert) {
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

  return runDisplacement(device, current, width, height, params.contrast)
}
