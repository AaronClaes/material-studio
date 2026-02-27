import { registerPipelineCacheReset } from './device'
import { createUniformBuffer } from './buffers'
import type { GPUImageBuffer } from '@/features/workflow/types'

const WGSL = /* wgsl */ `
struct Dims {
  width: u32,
  height: u32,
}

@group(0) @binding(0) var<storage, read> pixels: array<u32>;
@group(0) @binding(1) var<uniform> dims: Dims;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VOut {
  // Full-screen triangle covering NDC [-1,1]x[-1,1]
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0),
  );
  // Y-flip: NDC y=-1 (bottom) → uv v=1 (bottom of image); NDC y=1 (top) → uv v=0 (top of image)
  var uvs = array<vec2f, 3>(
    vec2f(0.0, 1.0),
    vec2f(2.0, 1.0),
    vec2f(0.0, -1.0),
  );
  var out: VOut;
  out.pos = vec4f(positions[vi], 0.0, 1.0);
  out.uv = uvs[vi];
  return out;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4f {
  let x = u32(clamp(in.uv.x * f32(dims.width), 0.0, f32(dims.width) - 1.0));
  let y = u32(clamp(in.uv.y * f32(dims.height), 0.0, f32(dims.height) - 1.0));
  let packed = pixels[y * dims.width + x];
  let r = f32(packed & 0xFFu) / 255.0;
  let g = f32((packed >> 8u) & 0xFFu) / 255.0;
  let b = f32((packed >> 16u) & 0xFFu) / 255.0;
  let a = f32((packed >> 24u) & 0xFFu) / 255.0;
  return vec4f(r, g, b, a);
}
`

let cachedPipeline: {
  pipeline: GPURenderPipeline
  format: GPUTextureFormat
} | null = null

registerPipelineCacheReset(() => {
  cachedPipeline = null
})

function getPipeline(device: GPUDevice): {
  pipeline: GPURenderPipeline
  format: GPUTextureFormat
} {
  const format = navigator.gpu.getPreferredCanvasFormat()
  if (!cachedPipeline || cachedPipeline.format !== format) {
    const module = device.createShaderModule({ code: WGSL })
    cachedPipeline = {
      pipeline: device.createRenderPipeline({
        layout: 'auto',
        vertex: { module, entryPoint: 'vs' },
        fragment: { module, entryPoint: 'fs', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      }),
      format,
    }
  }
  return cachedPipeline
}

export async function gpuBufferToObjectUrl(
  device: GPUDevice,
  img: GPUImageBuffer,
  format = 'image/png',
): Promise<string> {
  const canvas = new OffscreenCanvas(img.width, img.height)
  const context = canvas.getContext('webgpu') as GPUCanvasContext

  const { pipeline, format: canvasFormat } = getPipeline(device)
  context.configure({ device, format: canvasFormat, alphaMode: 'opaque' })

  const uniformData = new ArrayBuffer(8)
  const view = new DataView(uniformData)
  view.setUint32(0, img.width, true)
  view.setUint32(4, img.height, true)
  const uniformBuffer = createUniformBuffer(device, uniformData)

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: img.buffer } },
      { binding: 1, resource: { buffer: uniformBuffer } },
    ],
  })

  const encoder = device.createCommandEncoder()
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      },
    ],
  })
  pass.setPipeline(pipeline)
  pass.setBindGroup(0, bindGroup)
  pass.draw(3)
  pass.end()
  device.queue.submit([encoder.finish()])

  uniformBuffer.destroy()

  await device.queue.onSubmittedWorkDone()
  const blob = await canvas.convertToBlob({ type: format })
  return URL.createObjectURL(blob)
}
