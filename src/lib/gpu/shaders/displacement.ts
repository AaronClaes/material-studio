import { registerPipelineCacheReset } from '../device'
import { createStorageBuffer, createUniformBuffer, readBackAsUint8 } from '../buffers'

const WGSL = /* wgsl */ `
struct Params {
  count: u32,
  contrast: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> heights: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<u32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let h = clamp(0.5 + (heights[idx] - 0.5) * (1.0 + params.contrast), 0.0, 1.0);
  let v = u32(round(h * 255.0));

  // Pack as RGBA little-endian: R | G<<8 | B<<16 | A<<24
  output[idx] = v | (v << 8u) | (v << 16u) | (255u << 24u);
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

export async function runDisplacement(
  device: GPUDevice,
  heightsBuffer: GPUBuffer,
  w: number,
  h: number,
  contrast: number,
): Promise<ImageData> {
  const count = w * h

  const uniformData = new ArrayBuffer(8)
  const view = new DataView(uniformData)
  view.setUint32(0, count, true)
  view.setFloat32(4, contrast, true)
  const uniformBuffer = createUniformBuffer(device, uniformData)

  const outputBuffer = createStorageBuffer(device, count * 4)

  const p = getPipeline(device)
  const bindGroup = device.createBindGroup({
    layout: p.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: heightsBuffer } },
      { binding: 2, resource: { buffer: outputBuffer } },
    ],
  })

  const encoder = device.createCommandEncoder()
  const pass = encoder.beginComputePass()
  pass.setPipeline(p)
  pass.setBindGroup(0, bindGroup)
  pass.dispatchWorkgroups(Math.ceil(count / 256))
  pass.end()
  device.queue.submit([encoder.finish()])

  const result = await readBackAsUint8(device, outputBuffer, count * 4)

  uniformBuffer.destroy()
  outputBuffer.destroy()
  heightsBuffer.destroy()

  return new ImageData(result, w, h)
}
