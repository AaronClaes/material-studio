import { registerPipelineCacheReset } from '../device'
import { createStorageBuffer, createUniformBuffer } from '../buffers'
import type { GPUImageBuffer } from '@/features/workflow/types'

const WGSL = /* wgsl */ `
struct Params {
  src_width: u32,
  src_height: u32,
  crop_x: u32,
  crop_y: u32,
  out_width: u32,
  out_height: u32,
  _pad0: u32,
  _pad1: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> src: array<u32>;
@group(0) @binding(2) var<storage, read_write> dst: array<u32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let total = params.out_width * params.out_height;
  if (idx >= total) { return; }

  let out_y = idx / params.out_width;
  let out_x = idx % params.out_width;

  let src_x = clamp(out_x + params.crop_x, 0u, params.src_width - 1u);
  let src_y = clamp(out_y + params.crop_y, 0u, params.src_height - 1u);

  dst[idx] = src[src_y * params.src_width + src_x];
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

export function runCrop(
  device: GPUDevice,
  src: GPUImageBuffer,
  params: { x: number; y: number; width: number; height: number },
): GPUImageBuffer {
  const srcW = src.width
  const srcH = src.height

  const x = Math.max(0, Math.min(params.x, srcW - 1))
  const y = Math.max(0, Math.min(params.y, srcH - 1))
  const outW = Math.max(1, Math.min(params.width, srcW - x))
  const outH = Math.max(1, Math.min(params.height, srcH - y))

  const uniformData = new ArrayBuffer(32)
  const view = new DataView(uniformData)
  view.setUint32(0, srcW, true)
  view.setUint32(4, srcH, true)
  view.setUint32(8, x, true)
  view.setUint32(12, y, true)
  view.setUint32(16, outW, true)
  view.setUint32(20, outH, true)
  view.setUint32(24, 0, true) // pad
  view.setUint32(28, 0, true) // pad
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
