import { registerPipelineCacheReset } from '../device'
import { createUniformBuffer } from '../buffers'
import type { GPUImageBuffer } from '@/types/studio'

const WGSL = /* wgsl */ `
struct Params {
  out_w: u32,
  src_w: u32,
  patch_size: u32,
  block_out_x: u32,
  block_out_y: u32,
  patch_src_x: u32,
  patch_src_y: u32,
  out_h: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> src: array<u32>;
@group(0) @binding(2) var<storage, read> seam_mask: array<u32>;
@group(0) @binding(3) var<storage, read_write> canvas: array<u32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let total = params.patch_size * params.patch_size;
  if (idx >= total) { return; }

  let py = idx / params.patch_size;
  let px = idx % params.patch_size;

  let cx = params.block_out_x + px;
  let cy = params.block_out_y + py;
  if (cx >= params.out_w || cy >= params.out_h) { return; }

  if (seam_mask[idx] == 1u) {
    let src_y = params.patch_src_y + py;
    let src_x = params.patch_src_x + px;
    canvas[cy * params.out_w + cx] = src[src_y * params.src_w + src_x];
  }
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

export function runQuiltingComposite(
  device: GPUDevice,
  src: GPUImageBuffer,
  canvasBuffer: GPUBuffer,
  seamMaskBuffer: GPUBuffer,
  params: {
    outWidth: number
    outHeight: number
    srcWidth: number
    patchSize: number
    blockOutX: number
    blockOutY: number
    patchSrcX: number
    patchSrcY: number
  },
): void {
  const patch = params.patchSize

  const uniformData = new ArrayBuffer(32)
  const view = new DataView(uniformData)
  view.setUint32(0, params.outWidth, true)
  view.setUint32(4, params.srcWidth, true)
  view.setUint32(8, patch, true)
  view.setUint32(12, params.blockOutX, true)
  view.setUint32(16, params.blockOutY, true)
  view.setUint32(20, params.patchSrcX, true)
  view.setUint32(24, params.patchSrcY, true)
  view.setUint32(28, params.outHeight, true)
  const uniformBuffer = createUniformBuffer(device, uniformData)

  const p = getPipeline(device)
  const bindGroup = device.createBindGroup({
    layout: p.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: src.buffer } },
      { binding: 2, resource: { buffer: seamMaskBuffer } },
      { binding: 3, resource: { buffer: canvasBuffer } },
    ],
  })

  const encoder = device.createCommandEncoder()
  const pass = encoder.beginComputePass()
  pass.setPipeline(p)
  pass.setBindGroup(0, bindGroup)
  pass.dispatchWorkgroups(Math.ceil((patch * patch) / 256))
  pass.end()
  device.queue.submit([encoder.finish()])

  uniformBuffer.destroy()
}
