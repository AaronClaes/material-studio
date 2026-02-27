import { registerPipelineCacheReset } from '../device'
import { createStorageBuffer, createUniformBuffer } from '../buffers'

const WGSL = /* wgsl */ `
const PI: f32 = 3.14159265358979323846;
const RAY_COUNT: u32 = 16u;

struct Params {
  width: u32,
  height: u32,
  radius: f32,
  strength: f32,
  mean: f32,
  _pad1: u32,
  _pad2: u32,
  _pad3: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> heights: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<u32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let total = params.width * params.height;
  if (idx >= total) { return; }

  let y = idx / params.width;
  let x = idx % params.width;
  let centerH = heights[idx];

  var occluded = 0.0;
  for (var r = 0u; r < RAY_COUNT; r++) {
    let angle = f32(r) / f32(RAY_COUNT) * 2.0 * PI;
    let sx = clamp(i32(round(f32(x) + cos(angle) * params.radius)), 0, i32(params.width) - 1);
    let sy = clamp(i32(round(f32(y) + sin(angle) * params.radius)), 0, i32(params.height) - 1);
    if (heights[u32(sy) * params.width + u32(sx)] > centerH) {
      occluded += 1.0;
    }
  }

  var ao = 1.0 - (occluded / f32(RAY_COUNT)) * params.strength;
  ao = clamp(ao + (params.mean - 0.5), 0.0, 1.0);
  let v = u32(round(ao * 255.0));

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

export function runAomap(
  device: GPUDevice,
  heightsBuffer: GPUBuffer,
  w: number,
  h: number,
  params: {
    radius: number
    strength: number
    mean: number
  },
): GPUBuffer {
  const count = w * h

  // 8 x 4 bytes = 32 bytes (16-byte aligned)
  const uniformData = new ArrayBuffer(32)
  const view = new DataView(uniformData)
  view.setUint32(0, w, true)
  view.setUint32(4, h, true)
  view.setFloat32(8, params.radius, true)
  view.setFloat32(12, params.strength, true)
  view.setFloat32(16, params.mean, true)
  view.setUint32(20, 0, true) // pad
  view.setUint32(24, 0, true) // pad
  view.setUint32(28, 0, true) // pad
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

  uniformBuffer.destroy()

  return outputBuffer
}
