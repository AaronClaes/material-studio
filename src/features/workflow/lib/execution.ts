import type {
  GPUImageBuffer,
  StudioEdge,
  StudioNode,
  StudioNodeData,
} from '@/features/workflow/types'
import {
  processAomapNode,
  processColorNode,
  processCropNode,
  processDisplacementNode,
  processInputNode,
  processNormalmapNode,
  processOutputNode,
  processQuiltingNode,
  processResolutionNode,
} from '@/shared/gpu/processors'
import { getGPUDevice, gpuBufferToObjectUrl } from '@/shared/gpu'

export function topoSort(
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
): Array<string> {
  const ids = new Set(nodes.map((n) => n.id))
  const inDegree = new Map<string, number>()
  const adj = new Map<string, Array<string>>()

  for (const id of ids) {
    inDegree.set(id, 0)
    adj.set(id, [])
  }

  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue
    adj.get(edge.source)!.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  const queue: Array<string> = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted: Array<string> = []
  while (queue.length > 0) {
    const current = queue.shift()!
    sorted.push(current)
    for (const neighbor of adj.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 0) - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  if (sorted.length !== ids.size) {
    throw new Error('Cycle detected in workflow graph')
  }

  return sorted
}

export interface RunCallbacks {
  onNodeStart: (id: string) => void
  onNodeDone: (id: string, dataUrl: string) => void
  onNodeError: (id: string, error: string) => void
  onNodeSkipped: (id: string, dataUrl: string) => void
}

interface ResolvedWorkflow {
  nodes: Array<StudioNode>
  edges: Array<StudioEdge>
}

export interface RunOptions {
  currentWorkflowId?: string
  callStack?: Array<string>
  workflowResolver?: (workflowId: string) => ResolvedWorkflow | undefined
}

/**
 * Result of processing a single node. All nodes now produce a GPUImageBuffer
 * that lives in GPU memory until the graph slice finishes.
 */
type NodeProcessResult =
  | { kind: 'image'; gpuBuffer: GPUImageBuffer; dataUrl: string }
  | { kind: 'output'; gpuBuffer: GPUImageBuffer; dataUrl: string }

const NOOP_CALLBACKS: RunCallbacks = {
  onNodeStart: () => {},
  onNodeDone: () => {},
  onNodeError: () => {},
  onNodeSkipped: () => {},
}

function getUpstreamIds(
  endNodeId: string,
  edges: Array<StudioEdge>,
): Set<string> {
  const reverseAdj = new Map<string, Array<string>>()
  for (const edge of edges) {
    const list = reverseAdj.get(edge.target) ?? []
    list.push(edge.source)
    reverseAdj.set(edge.target, list)
  }

  const visited = new Set<string>()
  const queue = [endNodeId]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    for (const upstreamId of reverseAdj.get(id) ?? []) {
      queue.push(upstreamId)
    }
  }

  return visited
}

function getIdsBetweenNodes(
  startNodeId: string,
  endNodeId: string,
  edges: Array<StudioEdge>,
): Set<string> {
  const downstreamIds = getDownstreamIds(startNodeId, edges)
  if (!downstreamIds.has(endNodeId)) {
    throw new Error('End node must be downstream from the selected start node')
  }

  const upstreamOfEndIds = getUpstreamIds(endNodeId, edges)
  const betweenIds = new Set<string>()
  for (const id of downstreamIds) {
    if (upstreamOfEndIds.has(id)) betweenIds.add(id)
  }
  return betweenIds
}

function buildIncomingEdgesMap(
  edges: Array<StudioEdge>,
): Map<string, Array<string>> {
  const map = new Map<string, Array<string>>()
  for (const edge of edges) {
    const list = map.get(edge.target) ?? []
    list.push(edge.source)
    map.set(edge.target, list)
  }
  return map
}

function seedInitialInput(
  startNodeId: string,
  initialInput: GPUImageBuffer | undefined,
  edges: Array<StudioEdge>,
  incomingEdges: Map<string, Array<string>>,
  outputs: Map<string, Array<GPUImageBuffer>>,
) {
  if (!initialInput) return

  const upstreamEdge = edges.find((e) => e.target === startNodeId)
  if (upstreamEdge) {
    incomingEdges.set(startNodeId, [upstreamEdge.source])
    outputs.set(upstreamEdge.source, [initialInput])
    return
  }

  const seedId = `__initial-input__${startNodeId}`
  incomingEdges.set(startNodeId, [seedId])
  outputs.set(seedId, [initialInput])
}

/** Destroy all unique GPUBuffers held in the outputs map. */
function destroyAllOutputs(outputs: Map<string, Array<GPUImageBuffer>>): void {
  const destroyed = new Set<GPUBuffer>()
  for (const imgs of outputs.values()) {
    for (const img of imgs) {
      if (!destroyed.has(img.buffer)) {
        img.buffer.destroy()
        destroyed.add(img.buffer)
      }
    }
  }
}

/** Destroy all outputs EXCEPT those for keepId (used for nested workflow cleanup). */
function destroyOutputsExcept(
  outputs: Map<string, Array<GPUImageBuffer>>,
  keepId: string,
): void {
  const keepBuffers = new Set(
    (outputs.get(keepId) ?? []).map((img) => img.buffer),
  )
  const destroyed = new Set<GPUBuffer>()
  for (const imgs of outputs.values()) {
    for (const img of imgs) {
      if (keepBuffers.has(img.buffer)) continue
      if (!destroyed.has(img.buffer)) {
        img.buffer.destroy()
        destroyed.add(img.buffer)
      }
    }
  }
}

async function runGraphSlice(options: {
  device: GPUDevice
  startNodeId: string
  endNodeId?: string
  initialInput: GPUImageBuffer | undefined
  nodes: Array<StudioNode>
  edges: Array<StudioEdge>
  callbacks: RunCallbacks
  runOptions?: RunOptions
}): Promise<void> {
  const idsToRun = options.endNodeId
    ? getIdsBetweenNodes(options.startNodeId, options.endNodeId, options.edges)
    : getDownstreamIds(options.startNodeId, options.edges)

  const nodesToRun = options.nodes.filter((node) => idsToRun.has(node.id))
  const edgesToRun = options.edges.filter(
    (edge) => idsToRun.has(edge.source) && idsToRun.has(edge.target),
  )

  const order = topoSort(nodesToRun, edgesToRun)
  const nodeMap = new Map(options.nodes.map((node) => [node.id, node]))
  const incomingEdges = buildIncomingEdgesMap(edgesToRun)
  const outputs = new Map<string, Array<GPUImageBuffer>>()

  seedInitialInput(
    options.startNodeId,
    options.initialInput,
    options.edges,
    incomingEdges,
    outputs,
  )

  await executeOrder(
    options.device,
    order,
    nodeMap,
    incomingEdges,
    outputs,
    options.callbacks,
    options.runOptions,
  )

  destroyAllOutputs(outputs)
}

/**
 * Runs a graph slice and returns the end node's GPU buffer, destroying all
 * other intermediate buffers. Used by nested workflow nodes so the caller can
 * continue the outer GPU pipeline with the result.
 */
async function runGraphSliceRetaining(options: {
  device: GPUDevice
  startNodeId: string
  endNodeId: string
  initialInput: GPUImageBuffer | undefined
  nodes: Array<StudioNode>
  edges: Array<StudioEdge>
  runOptions?: RunOptions
}): Promise<GPUImageBuffer> {
  const idsToRun = getIdsBetweenNodes(
    options.startNodeId,
    options.endNodeId,
    options.edges,
  )

  const nodesToRun = options.nodes.filter((node) => idsToRun.has(node.id))
  const edgesToRun = options.edges.filter(
    (edge) => idsToRun.has(edge.source) && idsToRun.has(edge.target),
  )

  const order = topoSort(nodesToRun, edgesToRun)
  const nodeMap = new Map(options.nodes.map((node) => [node.id, node]))
  const incomingEdges = buildIncomingEdgesMap(edgesToRun)
  const outputs = new Map<string, Array<GPUImageBuffer>>()

  seedInitialInput(
    options.startNodeId,
    options.initialInput,
    options.edges,
    incomingEdges,
    outputs,
  )

  await executeOrder(
    options.device,
    order,
    nodeMap,
    incomingEdges,
    outputs,
    NOOP_CALLBACKS,
    options.runOptions,
  )

  const outputArr = outputs.get(options.endNodeId)
  if (!outputArr?.length)
    throw new Error('Selected end node did not produce output')
  // For nested workflows, return the first instance (nested workflows have a
  // single linear execution path — fan-in inside a nested workflow is not
  // expected to fan-out into the parent graph).
  const output = outputArr[0]!

  destroyOutputsExcept(outputs, options.endNodeId)

  return output
}

async function processNode(
  device: GPUDevice,
  data: StudioNodeData,
  input: GPUImageBuffer | undefined,
  runOptions?: RunOptions,
): Promise<NodeProcessResult> {
  if (data.kind === 'inputNode') {
    if (data.src) {
      const gpuBuffer = await processInputNode(device, data.src)
      const dataUrl = await gpuBufferToObjectUrl(device, gpuBuffer)
      return { kind: 'image', gpuBuffer, dataUrl }
    }
    if (!input) throw new Error('No image selected')
    const dataUrl = await gpuBufferToObjectUrl(device, input)
    return { kind: 'image', gpuBuffer: input, dataUrl }
  }

  if (!input) throw new Error('No upstream input')

  if (data.kind === 'crop') {
    const gpuBuffer = await processCropNode(device, input, {
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
    })
    const dataUrl = await gpuBufferToObjectUrl(device, gpuBuffer)
    return { kind: 'image', gpuBuffer, dataUrl }
  }

  if (data.kind === 'resolution') {
    const gpuBuffer = await processResolutionNode(device, input, {
      width: data.width,
      height: data.height,
      maintainAspect: data.maintainAspect,
    })
    const dataUrl = await gpuBufferToObjectUrl(device, gpuBuffer)
    return { kind: 'image', gpuBuffer, dataUrl }
  }

  if (data.kind === 'color') {
    const gpuBuffer = await processColorNode(device, input, {
      brightness: data.brightness,
      contrast: data.contrast,
      saturation: data.saturation,
      hue: data.hue,
      tintColor: data.tintColor,
    })
    const dataUrl = await gpuBufferToObjectUrl(device, gpuBuffer)
    return { kind: 'image', gpuBuffer, dataUrl }
  }

  if (data.kind === 'normalmap') {
    const gpuBuffer = await processNormalmapNode(device, input, {
      strength: data.strength,
      level: data.level,
      blurSharp: data.blurSharp,
      filter: data.filter,
      invertR: data.invertR,
      invertG: data.invertG,
      invertHeight: data.invertHeight,
      zRange: data.zRange,
    })
    const dataUrl = await gpuBufferToObjectUrl(device, gpuBuffer)
    return { kind: 'image', gpuBuffer, dataUrl }
  }

  if (data.kind === 'displacement') {
    const gpuBuffer = await processDisplacementNode(device, input, {
      contrast: data.contrast,
      blurSharp: data.blurSharp,
      invert: data.invert,
    })
    const dataUrl = await gpuBufferToObjectUrl(device, gpuBuffer)
    return { kind: 'image', gpuBuffer, dataUrl }
  }

  if (data.kind === 'aomap') {
    const gpuBuffer = await processAomapNode(device, input, {
      strength: data.strength,
      mean: data.mean,
      range: data.range,
      blurSharp: data.blurSharp,
      invert: data.invert,
    })
    const dataUrl = await gpuBufferToObjectUrl(device, gpuBuffer)
    return { kind: 'image', gpuBuffer, dataUrl }
  }

  if (data.kind === 'quilting') {
    const gpuBuffer = await processQuiltingNode(device, input, {
      outputWidth: data.outputWidth,
      outputHeight: data.outputHeight,
      patchSize: data.patchSize,
      overlapFraction: data.overlapFraction,
      errorTolerance: data.errorTolerance,
      seed: data.seed,
    })
    const dataUrl = await gpuBufferToObjectUrl(device, gpuBuffer)
    return { kind: 'image', gpuBuffer, dataUrl }
  }

  if (data.kind === 'workflowNode') {
    if (!runOptions?.workflowResolver) {
      throw new Error('Workflow resolver unavailable')
    }
    if (!data.workflowId) throw new Error('Select a workflow')
    if (!data.startNodeId) throw new Error('Select a start node')
    if (!data.endNodeId) throw new Error('Select an end node')

    const stack =
      runOptions.callStack ??
      (runOptions.currentWorkflowId ? [runOptions.currentWorkflowId] : [])
    if (stack.includes(data.workflowId)) {
      throw new Error('Recursive nested workflow reference detected')
    }

    const nestedWorkflow = runOptions.workflowResolver(data.workflowId)
    if (!nestedWorkflow) throw new Error('Selected workflow no longer exists')

    const output = await runGraphSliceRetaining({
      device,
      startNodeId: data.startNodeId,
      endNodeId: data.endNodeId,
      initialInput: input,
      nodes: nestedWorkflow.nodes,
      edges: nestedWorkflow.edges,
      runOptions: {
        ...runOptions,
        currentWorkflowId: data.workflowId,
        callStack: [...stack, data.workflowId],
      },
    })

    const dataUrl = await gpuBufferToObjectUrl(device, output)
    return { kind: 'image', gpuBuffer: output, dataUrl }
  }

  // outputNode
  const result = await processOutputNode(device, input, { format: data.format })
  return {
    kind: 'output',
    gpuBuffer: result.gpuBuffer,
    dataUrl: result.dataUrl,
  }
}

/**
 * Walks a slice of the topological order, processing each node and threading
 * outputs downstream. `outputs` is mutated in place so callers can pre-seed
 * upstream results before calling (used by `runFromNode`).
 *
 * Fan-in: when a node has multiple incoming edges, it runs once per upstream
 * instance (the upstream output arrays are concatenated). Each instance
 * produces an independent GPUImageBuffer stored in the node's output array.
 */
async function executeOrder(
  device: GPUDevice,
  order: Array<string>,
  nodeMap: Map<string, StudioNode>,
  incomingEdges: Map<string, Array<string>>,
  outputs: Map<string, Array<GPUImageBuffer>>,
  callbacks: RunCallbacks,
  runOptions?: RunOptions,
): Promise<void> {
  const failed = new Set<string>()

  for (const id of order) {
    const node = nodeMap.get(id)
    if (!node) continue

    const upstreamIds = incomingEdges.get(id) ?? []

    // Collect all upstream output instances (fan-in: concatenate arrays)
    const inputs: Array<GPUImageBuffer> = []
    for (const upstreamId of upstreamIds) {
      const upstreamOutputs = outputs.get(upstreamId) ?? []
      inputs.push(...upstreamOutputs)
    }

    // All upstreams failed → propagate failure
    const allUpstreamsFailed =
      upstreamIds.length > 0 && upstreamIds.every((uid) => failed.has(uid))
    if (allUpstreamsFailed) {
      failed.add(id)
      callbacks.onNodeError(id, 'Skipped: upstream node failed')
      continue
    }

    // Skip disabled nodes — thread upstream data through unchanged (first instance)
    if (node.data.kind !== 'inputNode' && node.data.disabled) {
      if (inputs.length > 0) {
        outputs.set(id, inputs)
        const dataUrl = await gpuBufferToObjectUrl(device, inputs[0]!)
        callbacks.onNodeSkipped(id, dataUrl)
      }
      continue
    }

    callbacks.onNodeStart(id)

    // Root node (no upstreams): run once with undefined input
    const runInputs: Array<GPUImageBuffer | undefined> =
      inputs.length > 0 ? inputs : [undefined]

    try {
      const instanceBuffers: Array<GPUImageBuffer> = []
      for (const input of runInputs) {
        const result = await processNode(device, node.data, input, runOptions)
        instanceBuffers.push(result.gpuBuffer)
        callbacks.onNodeDone(id, result.dataUrl)
      }
      outputs.set(id, instanceBuffers)
    } catch (err) {
      failed.add(id)
      callbacks.onNodeError(
        id,
        err instanceof Error ? err.message : String(err),
      )
    }
  }
}

export async function runSingleNode(
  nodeId: string,
  input: GPUImageBuffer,
  nodes: Array<StudioNode>,
  callbacks: RunCallbacks,
  runOptions?: RunOptions,
): Promise<void> {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return

  const device = await getGPUDevice()

  callbacks.onNodeStart(nodeId)

  try {
    const result = await processNode(device, node.data, input, runOptions)
    callbacks.onNodeDone(nodeId, result.dataUrl)
    result.gpuBuffer.buffer.destroy()
  } catch (err) {
    callbacks.onNodeError(
      nodeId,
      err instanceof Error ? err.message : String(err),
    )
  }
}

/**
 * Like runSingleNode but accepts multiple inputs for fan-in nodes.
 * Calls onNodeStart once, then processes each input in sequence,
 * emitting onNodeDone per instance so allOutputDataUrls accumulates correctly.
 */
export async function runSingleNodeWithInputs(
  nodeId: string,
  inputs: Array<GPUImageBuffer>,
  nodes: Array<StudioNode>,
  callbacks: RunCallbacks,
  runOptions?: RunOptions,
): Promise<void> {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return

  const device = await getGPUDevice()

  callbacks.onNodeStart(nodeId)

  try {
    for (const input of inputs) {
      const result = await processNode(device, node.data, input, runOptions)
      callbacks.onNodeDone(nodeId, result.dataUrl)
      result.gpuBuffer.buffer.destroy()
    }
  } catch (err) {
    callbacks.onNodeError(
      nodeId,
      err instanceof Error ? err.message : String(err),
    )
  }
}

/**
 * Like runFromNode but seeds multiple upstream GPUImageBuffers simultaneously
 * so fan-in nodes receive all inputs in a single executeOrder pass.
 */
export async function runFromNodeWithInputs(
  startNodeId: string,
  upstreamBuffers: Map<string, GPUImageBuffer>,
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
  callbacks: RunCallbacks,
  runOptions?: RunOptions,
): Promise<void> {
  const device = await getGPUDevice()
  const idsToRun = getDownstreamIds(startNodeId, edges)
  const nodesToRun = nodes.filter((node) => idsToRun.has(node.id))
  const edgesToRun = edges.filter(
    (edge) => idsToRun.has(edge.source) && idsToRun.has(edge.target),
  )
  const order = topoSort(nodesToRun, edgesToRun)
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const incomingEdges = buildIncomingEdgesMap(edgesToRun)
  const outputs = new Map<string, Array<GPUImageBuffer>>()

  // Seed all upstream inputs simultaneously so the fan-in node receives them
  // in a single pass (vs. calling runFromNode once per upstream, which would
  // reset allOutputDataUrls on each onNodeStart call).
  incomingEdges.set(startNodeId, [...upstreamBuffers.keys()])
  for (const [upstreamId, buffer] of upstreamBuffers) {
    outputs.set(upstreamId, [buffer])
  }

  await executeOrder(device, order, nodeMap, incomingEdges, outputs, callbacks, runOptions)
  destroyAllOutputs(outputs)
}

export function getDownstreamIds(
  startNodeId: string,
  edges: Array<StudioEdge>,
): Set<string> {
  const adj = new Map<string, Array<string>>()
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, [])
    adj.get(edge.source)!.push(edge.target)
  }

  const visited = new Set<string>()
  const queue = [startNodeId]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    for (const neighbor of adj.get(id) ?? []) {
      queue.push(neighbor)
    }
  }
  return visited
}

export async function runFromNode(
  startNodeId: string,
  initialInput: GPUImageBuffer | undefined,
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
  callbacks: RunCallbacks,
  runOptions?: RunOptions,
): Promise<void> {
  const device = await getGPUDevice()
  await runGraphSlice({
    device,
    startNodeId,
    initialInput,
    nodes,
    edges,
    callbacks,
    runOptions,
  })
}

/**
 * Runs all nodes in a single toposorted pass. Handles fan-in correctly because
 * every node (including multiple input roots) is processed in one executeOrder
 * call, so fan-in nodes accumulate all upstream instances without any
 * intermediate onNodeStart resets.
 */
export async function runGraph(
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
  callbacks: RunCallbacks,
  runOptions?: RunOptions,
): Promise<void> {
  const device = await getGPUDevice()
  const order = topoSort(nodes, edges)
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const incomingEdges = buildIncomingEdgesMap(edges)
  const outputs = new Map<string, Array<GPUImageBuffer>>()
  await executeOrder(device, order, nodeMap, incomingEdges, outputs, callbacks, runOptions)
  destroyAllOutputs(outputs)
}
