import { registerPipelineCacheReset } from '../device'
import { createStorageBuffer, createUniformBuffer } from '../buffers'

const BLUR_WGSL = /* wgsl */ `
struct Params {
  width: u32,
  height: u32,
  radius: u32,
  _pad: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> input: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn horizontal(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let total = params.width * params.height;
  if (idx >= total) { return; }

  let y = idx / params.width;
  let x = idx % params.width;
  let r = i32(params.radius);

  var sum = 0.0;
  var count = 0.0;
  for (var dx = -r; dx <= r; dx++) {
    let sx = clamp(i32(x) + dx, 0, i32(params.width) - 1);
    sum += input[y * params.width + u32(sx)];
    count += 1.0;
  }
  output[idx] = sum / count;
}

@compute @workgroup_size(256)
fn vertical(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let total = params.width * params.height;
  if (idx >= total) { return; }

  let y = idx / params.width;
  let x = idx % params.width;
  let r = i32(params.radius);

  var sum = 0.0;
  var count = 0.0;
  for (var dy = -r; dy <= r; dy++) {
    let sy = clamp(i32(y) + dy, 0, i32(params.height) - 1);
    sum += input[u32(sy) * params.width + x];
    count += 1.0;
  }
  output[idx] = sum / count;
}
`

const UNSHARP_WGSL = /* wgsl */ `
struct Params {
  count: u32,
  factor: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> original: array<f32>;
@group(0) @binding(2) var<storage, read> blurred: array<f32>;
@group(0) @binding(3) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let o = original[idx];
  let b = blurred[idx];
  output[idx] = clamp(o + params.factor * (o - b), 0.0, 1.0);
}
`

const INVERT_WGSL = /* wgsl */ `
struct Params {
  count: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> input: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }
  output[idx] = 1.0 - input[idx];
}
`

let blurHPipeline: GPUComputePipeline | null = null
let blurVPipeline: GPUComputePipeline | null = null
let unsharpPipeline: GPUComputePipeline | null = null
let invertPipeline: GPUComputePipeline | null = null

registerPipelineCacheReset(() => {
  blurHPipeline = null
  blurVPipeline = null
  unsharpPipeline = null
  invertPipeline = null
})

function getBlurPipelines(device: GPUDevice) {
  if (!blurHPipeline || !blurVPipeline) {
    const module = device.createShaderModule({ code: BLUR_WGSL })
    blurHPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module, entryPoint: 'horizontal' },
    })
    blurVPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module, entryPoint: 'vertical' },
    })
  }
  return { hPipeline: blurHPipeline, vPipeline: blurVPipeline }
}

function getUnsharpPipeline(device: GPUDevice): GPUComputePipeline {
  if (!unsharpPipeline) {
    unsharpPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module: device.createShaderModule({ code: UNSHARP_WGSL }) },
    })
  }
  return unsharpPipeline
}

function getInvertPipeline(device: GPUDevice): GPUComputePipeline {
  if (!invertPipeline) {
    invertPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module: device.createShaderModule({ code: INVERT_WGSL }) },
    })
  }
  return invertPipeline
}

function blurPass(
  device: GPUDevice,
  encoder: GPUCommandEncoder,
  pipeline: GPUComputePipeline,
  uniformBuffer: GPUBuffer,
  inputBuffer: GPUBuffer,
  outputBuffer: GPUBuffer,
  workgroups: number,
) {
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: inputBuffer } },
      { binding: 2, resource: { buffer: outputBuffer } },
    ],
  })
  const pass = encoder.beginComputePass()
  pass.setPipeline(pipeline)
  pass.setBindGroup(0, bindGroup)
  pass.dispatchWorkgroups(workgroups)
  pass.end()
}

export function runBlurSharp(
  device: GPUDevice,
  heightsBuffer: GPUBuffer,
  w: number,
  h: number,
  blurSharp: number,
): GPUBuffer {
  const count = w * h
  const workgroups = Math.ceil(count / 256)
  const bufferSize = count * 4

  if (blurSharp < 0) {
    // Triple box blur (approximates gaussian)
    const radius = Math.max(1, Math.round(Math.abs(blurSharp)))
    const uniformData = new ArrayBuffer(16)
    const view = new DataView(uniformData)
    view.setUint32(0, w, true)
    view.setUint32(4, h, true)
    view.setUint32(8, radius, true)
    view.setUint32(12, 0, true) // pad
    const uniformBuffer = createUniformBuffer(device, uniformData)

    const { hPipeline, vPipeline } = getBlurPipelines(device)

    // Triple box blur with separate tmpH for H-pass output to avoid aliasing.
    // vTargets alternates so V-pass output never aliases H-pass input.
    let current = heightsBuffer
    const tmpH = createStorageBuffer(device, bufferSize)
    const tmpA = createStorageBuffer(device, bufferSize)
    const tmpB = createStorageBuffer(device, bufferSize)
    const vTargets: [GPUBuffer, GPUBuffer, GPUBuffer] = [tmpA, tmpB, tmpA]

    const encoder = device.createCommandEncoder()

    for (const vTarget of vTargets) {
      blurPass(
        device,
        encoder,
        hPipeline,
        uniformBuffer,
        current,
        tmpH,
        workgroups,
      )
      blurPass(
        device,
        encoder,
        vPipeline,
        uniformBuffer,
        tmpH,
        vTarget,
        workgroups,
      )
      current = vTarget
    }

    device.queue.submit([encoder.finish()])

    tmpH.destroy()
    tmpB.destroy()
    uniformBuffer.destroy()

    return current // = tmpA after 3 passes
  } else {
    // Unsharp mask: sharpen
    const factor = blurSharp / 8

    // Single blur pass with radius=1
    const uniformData = new ArrayBuffer(16)
    const view = new DataView(uniformData)
    view.setUint32(0, w, true)
    view.setUint32(4, h, true)
    view.setUint32(8, 1, true) // radius=1
    view.setUint32(12, 0, true)
    const uniformBuffer = createUniformBuffer(device, uniformData)

    const { hPipeline, vPipeline } = getBlurPipelines(device)
    const tmpH = createStorageBuffer(device, bufferSize)
    const blurred = createStorageBuffer(device, bufferSize)

    const encoder = device.createCommandEncoder()
    blurPass(
      device,
      encoder,
      hPipeline,
      uniformBuffer,
      heightsBuffer,
      tmpH,
      workgroups,
    )
    blurPass(
      device,
      encoder,
      vPipeline,
      uniformBuffer,
      tmpH,
      blurred,
      workgroups,
    )

    // Unsharp mask
    const unsharpData = new ArrayBuffer(8)
    const uView = new DataView(unsharpData)
    uView.setUint32(0, count, true)
    uView.setFloat32(4, factor, true)
    const unsharpUniform = createUniformBuffer(device, unsharpData)

    const result = createStorageBuffer(device, bufferSize)
    const uPipeline = getUnsharpPipeline(device)
    const bindGroup = device.createBindGroup({
      layout: uPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: unsharpUniform } },
        { binding: 1, resource: { buffer: heightsBuffer } },
        { binding: 2, resource: { buffer: blurred } },
        { binding: 3, resource: { buffer: result } },
      ],
    })
    const pass = encoder.beginComputePass()
    pass.setPipeline(uPipeline)
    pass.setBindGroup(0, bindGroup)
    pass.dispatchWorkgroups(workgroups)
    pass.end()

    device.queue.submit([encoder.finish()])

    tmpH.destroy()
    blurred.destroy()
    uniformBuffer.destroy()
    unsharpUniform.destroy()

    return result
  }
}

export function runInvert(
  device: GPUDevice,
  buffer: GPUBuffer,
  count: number,
): GPUBuffer {
  const uniformData = new ArrayBuffer(4)
  new DataView(uniformData).setUint32(0, count, true)
  const uniformBuffer = createUniformBuffer(device, uniformData)

  const result = createStorageBuffer(device, count * 4)
  const p = getInvertPipeline(device)
  const bindGroup = device.createBindGroup({
    layout: p.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: buffer } },
      { binding: 2, resource: { buffer: result } },
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
  return result
}
