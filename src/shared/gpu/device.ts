let device: GPUDevice | null = null
let devicePromise: Promise<GPUDevice> | null = null
const pipelineCacheResetters: Array<() => void> = []

export function registerPipelineCacheReset(fn: () => void) {
  pipelineCacheResetters.push(fn)
}

function resetPipelineCaches() {
  for (const fn of pipelineCacheResetters) fn()
}

async function initDevice(): Promise<GPUDevice> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!navigator.gpu) {
    throw new Error('WebGPU is required but not supported by this browser')
  }

  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    throw new Error('WebGPU adapter not available')
  }

  const dev = await adapter.requestDevice()

  dev.lost.then(() => {
    device = null
    devicePromise = null
    resetPipelineCaches()
  })

  return dev
}

export async function getGPUDevice(): Promise<GPUDevice> {
  if (device) return device

  if (!devicePromise) {
    devicePromise = initDevice().then((dev) => {
      device = dev
      return dev
    })
  }

  return devicePromise
}
