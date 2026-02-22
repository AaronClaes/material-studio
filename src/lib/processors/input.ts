import { loadImageAsImageData } from './utils'

export function processInputNode(src: string): Promise<ImageData> {
  return loadImageAsImageData(src)
}

export function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
  return loadImageAsImageData(dataUrl)
}
