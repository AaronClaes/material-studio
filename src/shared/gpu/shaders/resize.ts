import { registerPipelineCacheReset } from '../device'
import { createStorageBuffer, createUniformBuffer } from '../buffers'
import type { GPUImageBuffer } from '@/features/workflow/types'

const WGSL = /* wgsl */ `
struct Params {
  src_width: u32,
  src_height: u32,
  out_width: u32,
  out_height: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> src: array<u32>;
@group(0) @binding(2) var<storage, read_write> dst: array<u32>;

fn unpack_pixel(p: u32) -> vec4f {
  return vec4f(
    f32(p & 0xFFu) / 255.0,
    f32((p >> 8u) & 0xFFu) / 255.0,
    f32((p >> 16u) & 0xFFu) / 255.0,
    f32((p >> 24u) & 0xFFu) / 255.0,
  );
}

fn pack_pixel(c: vec4f) -> u32 {
  let r = u32(clamp(c.r * 255.0, 0.0, 255.0));
  let g = u32(clamp(c.g * 255.0, 0.0, 255.0));
  let b = u32(clamp(c.b * 255.0, 0.0, 255.0));
  let a = u32(clamp(c.a * 255.0, 0.0, 255.0));
  return r | (g << 8u) | (b << 16u) | (a << 24u);
}

// Sample using module-level src binding with clamp-to-edge
fn sample_src(x: i32, y: i32) -> vec4f {
  let cx = u32(clamp(x, 0, i32(params.src_width) - 1));
  let cy = u32(clamp(y, 0, i32(params.src_height) - 1));
  return unpack_pixel(src[cy * params.src_width + cx]);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let total = params.out_width * params.out_height;
  if (idx >= total) { return; }

  let out_y = idx / params.out_width;
  let out_x = idx % params.out_width;

  // Center-aligned bilinear sampling
  let sx = (f32(out_x) + 0.5) * f32(params.src_width) / f32(params.out_width) - 0.5;
  let sy = (f32(out_y) + 0.5) * f32(params.src_height) / f32(params.out_height) - 0.5;

  let x0 = i32(floor(sx));
  let y0 = i32(floor(sy));
  let x1 = x0 + 1;
  let y1 = y0 + 1;

  let fx = sx - f32(x0);
  let fy = sy - f32(y0);

  let c00 = sample_src(x0, y0);
  let c10 = sample_src(x1, y0);
  let c01 = sample_src(x0, y1);
  let c11 = sample_src(x1, y1);

  let top = mix(c00, c10, fx);
  let bot = mix(c01, c11, fx);
  let result = mix(top, bot, fy);

  dst[idx] = pack_pixel(result);
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

export function runResize(
  device: GPUDevice,
  src: GPUImageBuffer,
  outW: number,
  outH: number,
): GPUImageBuffer {
  const uniformData = new ArrayBuffer(16)
  const view = new DataView(uniformData)
  view.setUint32(0, src.width, true)
  view.setUint32(4, src.height, true)
  view.setUint32(8, outW, true)
  view.setUint32(12, outH, true)
  const uniformBuffer = createUniformBuffer(device, uniformData)

  const dstBuffer = createStorageBuffer(device, outW * outH * 4)

  const p = getPipeline(device)
  const bindGroup = device.createBindGroup({
    layout: p.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: src.buffer } },
      { binding: 2, resource: { buffer: dstBuffer } },
    ],
  })

  const encoder = device.createCommandEncoder()
  const pass = encoder.beginComputePass()
  pass.setPipeline(p)
  pass.setBindGroup(0, bindGroup)
  pass.dispatchWorkgroups(Math.ceil((outW * outH) / 256))
  pass.end()
  device.queue.submit([encoder.finish()])

  uniformBuffer.destroy()

  return { buffer: dstBuffer, width: outW, height: outH }
}
