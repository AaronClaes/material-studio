import { registerPipelineCacheReset } from '../device'
import { createStorageBuffer, createUniformBuffer } from '../buffers'
import type { GPUImageBuffer } from '@/types/studio'

const WGSL = /* wgsl */ `
struct Params {
  src_w: u32,
  src_h: u32,
  out_w: u32,
  out_h: u32,
  patch_size: u32,
  overlap: u32,
  block_col: u32,
  block_row: u32,
  cand_cols: u32,
  cand_rows: u32,
  _pad0: u32,
  _pad1: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> src: array<u32>;
@group(0) @binding(2) var<storage, read> canvas: array<u32>;
@group(0) @binding(3) var<storage, read_write> ssd_out: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let total = params.cand_cols * params.cand_rows;
  if (idx >= total) { return; }

  let cand_col = idx % params.cand_cols;
  let cand_row = idx / params.cand_cols;
  let step = params.patch_size - params.overlap;
  let src_px = cand_col * step;
  let src_py = cand_row * step;
  let out_px = params.block_col * step;
  let out_py = params.block_row * step;

  var ssd: f32 = 0.0;

  if (params.block_col > 0u) {
    for (var y = 0u; y < params.patch_size; y++) {
      for (var x = 0u; x < params.overlap; x++) {
        let si = (src_py + y) * params.src_w + (src_px + x);
        let ci = (out_py + y) * params.out_w + (out_px + x);
        let s = src[si];
        let c = canvas[ci];
        let dr = f32(s & 0xFFu) - f32(c & 0xFFu);
        let dg = f32((s >> 8u) & 0xFFu) - f32((c >> 8u) & 0xFFu);
        let db = f32((s >> 16u) & 0xFFu) - f32((c >> 16u) & 0xFFu);
        ssd += dr * dr + dg * dg + db * db;
      }
    }
  }

  if (params.block_row > 0u) {
    for (var y = 0u; y < params.overlap; y++) {
      for (var x = 0u; x < params.patch_size; x++) {
        let si = (src_py + y) * params.src_w + (src_px + x);
        let ci = (out_py + y) * params.out_w + (out_px + x);
        let s = src[si];
        let c = canvas[ci];
        let dr = f32(s & 0xFFu) - f32(c & 0xFFu);
        let dg = f32((s >> 8u) & 0xFFu) - f32((c >> 8u) & 0xFFu);
        let db = f32((s >> 16u) & 0xFFu) - f32((c >> 16u) & 0xFFu);
        ssd += dr * dr + dg * dg + db * db;
      }
    }
  }

  ssd_out[idx] = ssd;
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

export function runQuiltingSSD(
  device: GPUDevice,
  src: GPUImageBuffer,
  canvas: GPUImageBuffer,
  params: {
    patchSize: number
    overlap: number
    blockCol: number
    blockRow: number
    candCols: number
    candRows: number
  },
): GPUBuffer {
  const candCount = params.candCols * params.candRows

  const uniformData = new ArrayBuffer(48)
  const view = new DataView(uniformData)
  view.setUint32(0, src.width, true)
  view.setUint32(4, src.height, true)
  view.setUint32(8, canvas.width, true)
  view.setUint32(12, canvas.height, true)
  view.setUint32(16, params.patchSize, true)
  view.setUint32(20, params.overlap, true)
  view.setUint32(24, params.blockCol, true)
  view.setUint32(28, params.blockRow, true)
  view.setUint32(32, params.candCols, true)
  view.setUint32(36, params.candRows, true)
  view.setUint32(40, 0, true) // _pad0
  view.setUint32(44, 0, true) // _pad1
  const uniformBuffer = createUniformBuffer(device, uniformData)

  const ssdBuffer = createStorageBuffer(device, candCount * 4)

  const p = getPipeline(device)
  const bindGroup = device.createBindGroup({
    layout: p.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: src.buffer } },
      { binding: 2, resource: { buffer: canvas.buffer } },
      { binding: 3, resource: { buffer: ssdBuffer } },
    ],
  })

  const encoder = device.createCommandEncoder()
  const pass = encoder.beginComputePass()
  pass.setPipeline(p)
  pass.setBindGroup(0, bindGroup)
  pass.dispatchWorkgroups(Math.ceil(candCount / 256))
  pass.end()
  device.queue.submit([encoder.finish()])

  uniformBuffer.destroy()

  return ssdBuffer
}
