export function uploadImageData(
  device: GPUDevice,
  imageData: ImageData,
): GPUBuffer {
  const pixels = new Uint32Array(imageData.data.buffer)
  const buffer = device.createBuffer({
    size: pixels.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
  })
  new Uint32Array(buffer.getMappedRange()).set(pixels)
  buffer.unmap()
  return buffer
}

export function uploadFloat32(
  device: GPUDevice,
  data: Float32Array,
): GPUBuffer {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
  })
  new Float32Array(buffer.getMappedRange()).set(data)
  buffer.unmap()
  return buffer
}

export function createStorageBuffer(
  device: GPUDevice,
  size: number,
): GPUBuffer {
  return device.createBuffer({
    size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  })
}

export function createUniformBuffer(
  device: GPUDevice,
  data: ArrayBuffer,
): GPUBuffer {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  })
  new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(data))
  buffer.unmap()
  return buffer
}

export async function readBackAsUint8(
  device: GPUDevice,
  buffer: GPUBuffer,
  size: number,
): Promise<Uint8ClampedArray<ArrayBuffer>> {
  const staging = device.createBuffer({
    size,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  })

  const encoder = device.createCommandEncoder()
  encoder.copyBufferToBuffer(buffer, 0, staging, 0, size)
  device.queue.submit([encoder.finish()])

  await staging.mapAsync(GPUMapMode.READ)
  const data = staging.getMappedRange()
  const result = new Uint8ClampedArray(new ArrayBuffer(data.byteLength))
  result.set(new Uint8ClampedArray(data))
  staging.unmap()
  staging.destroy()
  return result
}

export async function readBackAsFloat32(
  device: GPUDevice,
  buffer: GPUBuffer,
  size: number,
): Promise<Float32Array> {
  const staging = device.createBuffer({
    size,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  })

  const encoder = device.createCommandEncoder()
  encoder.copyBufferToBuffer(buffer, 0, staging, 0, size)
  device.queue.submit([encoder.finish()])

  await staging.mapAsync(GPUMapMode.READ)
  const result = new Float32Array(staging.getMappedRange().slice(0))
  staging.unmap()
  staging.destroy()
  return result
}
