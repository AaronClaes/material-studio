import { registerPipelineCacheReset } from '../device'
import { createStorageBuffer } from '../buffers'

const WGSL = /* wgsl */ `
@group(0) @binding(0) var<storage, read> input: array<u32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= arrayLength(&input)) { return; }

  let pixel = input[idx];
  let r = f32(pixel & 0xFFu) / 255.0;
  let g = f32((pixel >> 8u) & 0xFFu) / 255.0;
  let b = f32((pixel >> 16u) & 0xFFu) / 255.0;

  // BT.709 luminance
  output[idx] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
`

let pipeline: GPUComputePipeline | null = null
registerPipelineCacheReset(() => {
  pipeline = null
})

function getPipeline(device: GPUDevice): GPUComputePipeline {
  if (!pipeline) {
    pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module: device.createShaderModule({ code: WGSL }) },
    })
  }
  return pipeline
}

export function runGrayscale(
  device: GPUDevice,
  srcBuffer: GPUBuffer,
  pixelCount: number,
): GPUBuffer {
  const heightsBuffer = createStorageBuffer(device, pixelCount * 4)

  const p = getPipeline(device)
  const bindGroup = device.createBindGroup({
    layout: p.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: srcBuffer } },
      { binding: 1, resource: { buffer: heightsBuffer } },
    ],
  })

  const encoder = device.createCommandEncoder()
  const pass = encoder.beginComputePass()
  pass.setPipeline(p)
  pass.setBindGroup(0, bindGroup)
  pass.dispatchWorkgroups(Math.ceil(pixelCount / 256))
  pass.end()
  device.queue.submit([encoder.finish()])

  return heightsBuffer
}
