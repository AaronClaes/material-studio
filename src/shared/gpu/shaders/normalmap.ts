import { registerPipelineCacheReset } from '../device'
import { createStorageBuffer, createUniformBuffer } from '../buffers'

const WGSL = /* wgsl */ `
struct Params {
  width: u32,
  height: u32,
  scale: f32,
  invertR: u32,     // bool as u32
  invertG: u32,     // bool as u32
  zRange: u32,      // bool as u32
  useScharr: u32,   // bool as u32
  _pad: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> heights: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<u32>;

fn sample(x: i32, y: i32) -> f32 {
  let cx = clamp(x, 0, i32(params.width) - 1);
  let cy = clamp(y, 0, i32(params.height) - 1);
  return heights[u32(cy) * params.width + u32(cx)];
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let total = params.width * params.height;
  if (idx >= total) { return; }

  let y = i32(idx / params.width);
  let x = i32(idx % params.width);

  // Sample 3x3 neighborhood
  let tl = sample(x - 1, y - 1);
  let tc = sample(x,     y - 1);
  let tr = sample(x + 1, y - 1);
  let ml = sample(x - 1, y);
  let mr = sample(x + 1, y);
  let bl = sample(x - 1, y + 1);
  let bc = sample(x,     y + 1);
  let br = sample(x + 1, y + 1);

  var dX: f32;
  var dY: f32;

  if (params.useScharr != 0u) {
    // Scharr kernel
    dX = -3.0 * tl + 3.0 * tr - 10.0 * ml + 10.0 * mr - 3.0 * bl + 3.0 * br;
    dY = -3.0 * tl - 10.0 * tc - 3.0 * tr + 3.0 * bl + 10.0 * bc + 3.0 * br;
  } else {
    // Sobel kernel
    dX = -1.0 * tl + 1.0 * tr - 2.0 * ml + 2.0 * mr - 1.0 * bl + 1.0 * br;
    dY = -1.0 * tl - 2.0 * tc - 1.0 * tr + 1.0 * bl + 2.0 * bc + 1.0 * br;
  }

  var nx = -dX * params.scale;
  var ny = -dY * params.scale;
  var nz = 1.0;
  let len = sqrt(nx * nx + ny * ny + nz * nz);
  nx /= len;
  ny /= len;
  nz /= len;

  if (params.invertR != 0u) { nx = -nx; }
  if (params.invertG != 0u) { ny = -ny; }

  let r = u32(round(((nx + 1.0) / 2.0) * 255.0));
  let g = u32(round(((ny + 1.0) / 2.0) * 255.0));
  var b: u32;
  if (params.zRange != 0u) {
    b = u32(round(((nz + 1.0) / 2.0) * 255.0));
  } else {
    b = u32(round(nz * 127.0 + 128.0));
  }

  output[idx] = r | (g << 8u) | (b << 16u) | (255u << 24u);
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

export function runNormalmap(
  device: GPUDevice,
  heightsBuffer: GPUBuffer,
  w: number,
  h: number,
  params: {
    scale: number
    invertR: boolean
    invertG: boolean
    zRange: boolean
    useScharr: boolean
  },
): GPUBuffer {
  const count = w * h

  const uniformData = new ArrayBuffer(32)
  const view = new DataView(uniformData)
  view.setUint32(0, w, true)
  view.setUint32(4, h, true)
  view.setFloat32(8, params.scale, true)
  view.setUint32(12, params.invertR ? 1 : 0, true)
  view.setUint32(16, params.invertG ? 1 : 0, true)
  view.setUint32(20, params.zRange ? 1 : 0, true)
  view.setUint32(24, params.useScharr ? 1 : 0, true)
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
