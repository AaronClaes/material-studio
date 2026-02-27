import { registerPipelineCacheReset } from '../device'
import { createStorageBuffer, createUniformBuffer } from '../buffers'
import type { GPUImageBuffer } from '@/features/workflow/types'

const WGSL = /* wgsl */ `
const PI: f32 = 3.14159265358979323846;

struct Params {
  brightness: f32,
  contrast: f32,
  saturation: f32,
  hue_deg: f32,
  tint_r: f32,
  tint_g: f32,
  tint_b: f32,
  count: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> src: array<u32>;
@group(0) @binding(2) var<storage, read_write> dst: array<u32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let packed = src[idx];
  var r = f32(packed & 0xFFu) / 255.0;
  var g = f32((packed >> 8u) & 0xFFu) / 255.0;
  var b = f32((packed >> 16u) & 0xFFu) / 255.0;
  let a = f32((packed >> 24u) & 0xFFu) / 255.0;

  // Brightness: multiply all channels
  r *= params.brightness;
  g *= params.brightness;
  b *= params.brightness;

  // Contrast: scale around 0.5 (CSS contrast(x) = x*(c-0.5)+0.5)
  r = params.contrast * (r - 0.5) + 0.5;
  g = params.contrast * (g - 0.5) + 0.5;
  b = params.contrast * (b - 0.5) + 0.5;

  // Saturation: mix toward BT.709 luminance
  let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  r = mix(lum, r, params.saturation);
  g = mix(lum, g, params.saturation);
  b = mix(lum, b, params.saturation);

  // Hue rotation (W3C CSS hue-rotate matrix)
  let hue_rad = params.hue_deg * PI / 180.0;
  let cosH = cos(hue_rad);
  let sinH = sin(hue_rad);
  let nr = (0.213 + cosH * 0.787 - sinH * 0.213) * r
         + (0.715 - cosH * 0.715 - sinH * 0.715) * g
         + (0.072 - cosH * 0.072 + sinH * 0.928) * b;
  let ng = (0.213 - cosH * 0.213 + sinH * 0.143) * r
         + (0.715 + cosH * 0.285 + sinH * 0.140) * g
         + (0.072 - cosH * 0.072 - sinH * 0.283) * b;
  let nb = (0.213 - cosH * 0.213 - sinH * 0.787) * r
         + (0.715 - cosH * 0.715 + sinH * 0.715) * g
         + (0.072 + cosH * 0.928 + sinH * 0.072) * b;
  r = nr; g = ng; b = nb;

  // Tint: per-channel multiply
  r *= params.tint_r;
  g *= params.tint_g;
  b *= params.tint_b;

  let rv = u32(round(clamp(r, 0.0, 1.0) * 255.0));
  let gv = u32(round(clamp(g, 0.0, 1.0) * 255.0));
  let bv = u32(round(clamp(b, 0.0, 1.0) * 255.0));
  let av = u32(round(a * 255.0));
  dst[idx] = rv | (gv << 8u) | (bv << 16u) | (av << 24u);
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

export function runColorAdjust(
  device: GPUDevice,
  src: GPUImageBuffer,
  params: {
    brightness: number
    contrast: number
    saturation: number
    hueDeg: number
    tintR: number
    tintG: number
    tintB: number
  },
): GPUImageBuffer {
  const count = src.width * src.height

  const uniformData = new ArrayBuffer(32)
  const view = new DataView(uniformData)
  view.setFloat32(0, params.brightness, true)
  view.setFloat32(4, params.contrast, true)
  view.setFloat32(8, params.saturation, true)
  view.setFloat32(12, params.hueDeg, true)
  view.setFloat32(16, params.tintR, true)
  view.setFloat32(20, params.tintG, true)
  view.setFloat32(24, params.tintB, true)
  view.setUint32(28, count, true)
  const uniformBuffer = createUniformBuffer(device, uniformData)

  const dstBuffer = createStorageBuffer(device, count * 4)

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
  pass.dispatchWorkgroups(Math.ceil(count / 256))
  pass.end()
  device.queue.submit([encoder.finish()])

  uniformBuffer.destroy()

  return { buffer: dstBuffer, width: src.width, height: src.height }
}
