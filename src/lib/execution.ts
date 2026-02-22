import {
  imageDataToDataUrl,
  processAomapNode,
  processColorNode,
  processCropNode,
  processDisplacementNode,
  processInputNode,
  processNormalmapNode,
  processOutputNode,
  processResolutionNode,
} from './processors'
import type { StudioEdge, StudioNode, StudioNodeData } from '@/types/studio'

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
 * Result of processing a single node.
 * `dataUrl` is only set for outputNode; all others expose `imageData` for
 * passing downstream. This keeps the processor boundary explicit and makes it
 * straightforward to add new node kinds.
 */
type NodeProcessResult =
  | { kind: 'image'; imageData: ImageData; dataUrl: string }
  | { kind: 'output'; imageData: ImageData; dataUrl: string }

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

function buildIncomingEdgeMap(edges: Array<StudioEdge>): Map<string, string> {
  const map = new Map<string, string>()
  for (const edge of edges) {
    // First edge wins — prevents non-deterministic behaviour when multiple
    // edges target the same node (fan-in).
    if (!map.has(edge.target)) map.set(edge.target, edge.source)
  }
  return map
}

function seedInitialInput(
  startNodeId: string,
  initialInput: ImageData | undefined,
  edges: Array<StudioEdge>,
  incomingEdge: Map<string, string>,
  outputs: Map<string, ImageData>,
) {
  if (!initialInput) return

  const upstreamEdge = edges.find((e) => e.target === startNodeId)
  if (upstreamEdge) {
    incomingEdge.set(startNodeId, upstreamEdge.source)
    outputs.set(upstreamEdge.source, initialInput)
    return
  }

  const seedId = `__initial-input__${startNodeId}`
  incomingEdge.set(startNodeId, seedId)
  outputs.set(seedId, initialInput)
}

async function runGraphSlice(options: {
  startNodeId: string
  endNodeId?: string
  initialInput: ImageData | undefined
  nodes: Array<StudioNode>
  edges: Array<StudioEdge>
  callbacks: RunCallbacks
  runOptions?: RunOptions
}): Promise<Map<string, ImageData>> {
  const idsToRun = options.endNodeId
    ? getIdsBetweenNodes(options.startNodeId, options.endNodeId, options.edges)
    : getDownstreamIds(options.startNodeId, options.edges)

  const nodesToRun = options.nodes.filter((node) => idsToRun.has(node.id))
  const edgesToRun = options.edges.filter(
    (edge) => idsToRun.has(edge.source) && idsToRun.has(edge.target),
  )

  const order = topoSort(nodesToRun, edgesToRun)
  const nodeMap = new Map(options.nodes.map((node) => [node.id, node]))
  const incomingEdge = buildIncomingEdgeMap(edgesToRun)
  const outputs = new Map<string, ImageData>()

  seedInitialInput(
    options.startNodeId,
    options.initialInput,
    options.edges,
    incomingEdge,
    outputs,
  )

  await executeOrder(
    order,
    nodeMap,
    incomingEdge,
    outputs,
    options.callbacks,
    options.runOptions,
  )

  return outputs
}

async function processNode(
  data: StudioNodeData,
  input: ImageData | undefined,
  runOptions?: RunOptions,
): Promise<NodeProcessResult> {
  if (data.kind === 'inputNode') {
    if (data.src) {
      const imageData = await processInputNode(data.src)
      return {
        kind: 'image',
        imageData,
        dataUrl: imageDataToDataUrl(imageData),
      }
    }
    if (!input) throw new Error('No image selected')
    return { kind: 'image', imageData: input, dataUrl: imageDataToDataUrl(input) }
  }

  if (!input) throw new Error('No upstream input')

  if (data.kind === 'crop') {
    const imageData = await processCropNode(input, {
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
    })
    return { kind: 'image', imageData, dataUrl: imageDataToDataUrl(imageData) }
  }

  if (data.kind === 'resolution') {
    const imageData = await processResolutionNode(input, {
      width: data.width,
      height: data.height,
      maintainAspect: data.maintainAspect,
    })
    return { kind: 'image', imageData, dataUrl: imageDataToDataUrl(imageData) }
  }

  if (data.kind === 'color') {
    const imageData = await processColorNode(input, {
      brightness: data.brightness,
      contrast: data.contrast,
      saturation: data.saturation,
      hue: data.hue,
      tintColor: data.tintColor,
    })
    return { kind: 'image', imageData, dataUrl: imageDataToDataUrl(imageData) }
  }

  if (data.kind === 'normalmap') {
    const imageData = await processNormalmapNode(input, {
      strength: data.strength,
      level: data.level,
      blurSharp: data.blurSharp,
      filter: data.filter,
      invertR: data.invertR,
      invertG: data.invertG,
      invertHeight: data.invertHeight,
      zRange: data.zRange,
    })
    return { kind: 'image', imageData, dataUrl: imageDataToDataUrl(imageData) }
  }

  if (data.kind === 'displacement') {
    const imageData = await processDisplacementNode(input, {
      contrast: data.contrast,
      blurSharp: data.blurSharp,
      invert: data.invert,
    })
    return { kind: 'image', imageData, dataUrl: imageDataToDataUrl(imageData) }
  }

  if (data.kind === 'aomap') {
    const imageData = await processAomapNode(input, {
      strength: data.strength,
      mean: data.mean,
      range: data.range,
      blurSharp: data.blurSharp,
      invert: data.invert,
    })
    return { kind: 'image', imageData, dataUrl: imageDataToDataUrl(imageData) }
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

    const nestedOutputs = await runGraphSlice({
      startNodeId: data.startNodeId,
      endNodeId: data.endNodeId,
      initialInput: input,
      nodes: nestedWorkflow.nodes,
      edges: nestedWorkflow.edges,
      callbacks: NOOP_CALLBACKS,
      runOptions: {
        ...runOptions,
        currentWorkflowId: data.workflowId,
        callStack: [...stack, data.workflowId],
      },
    })

    const output = nestedOutputs.get(data.endNodeId)
    if (!output) {
      throw new Error('Selected end node did not produce output')
    }
    return { kind: 'image', imageData: output, dataUrl: imageDataToDataUrl(output) }
  }

  // outputNode
  const result = await processOutputNode(input, { format: data.format })
  return {
    kind: 'output',
    imageData: result.imageData,
    dataUrl: result.dataUrl,
  }
}

/**
 * Walks a slice of the topological order, processing each node and threading
 * outputs downstream. `outputs` is mutated in place so callers can pre-seed
 * upstream results before calling (used by `runFromNode`).
 */
async function executeOrder(
  order: Array<string>,
  nodeMap: Map<string, StudioNode>,
  incomingEdge: Map<string, string>,
  outputs: Map<string, ImageData>,
  callbacks: RunCallbacks,
  runOptions?: RunOptions,
): Promise<void> {
  const failed = new Set<string>()

  for (const id of order) {
    const node = nodeMap.get(id)
    if (!node) continue

    const upstreamId = incomingEdge.get(id)

    // Skip if upstream failed — no point processing downstream nodes
    if (upstreamId && failed.has(upstreamId)) {
      failed.add(id)
      callbacks.onNodeError(id, 'Skipped: upstream node failed')
      continue
    }

    // Skip disabled nodes — thread upstream data through unchanged
    if (node.data.kind !== 'inputNode' && node.data.disabled) {
      const upstreamData = upstreamId ? outputs.get(upstreamId) : undefined
      if (upstreamData) {
        outputs.set(id, upstreamData)
        callbacks.onNodeSkipped(id, imageDataToDataUrl(upstreamData))
      }
      continue
    }

    callbacks.onNodeStart(id)

    try {
      const input = upstreamId ? outputs.get(upstreamId) : undefined
      const result = await processNode(node.data, input, runOptions)
      outputs.set(id, result.imageData)
      callbacks.onNodeDone(id, result.dataUrl)
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
  input: ImageData,
  nodes: Array<StudioNode>,
  callbacks: RunCallbacks,
  runOptions?: RunOptions,
): Promise<void> {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return

  callbacks.onNodeStart(nodeId)

  try {
    const result = await processNode(node.data, input, runOptions)
    callbacks.onNodeDone(nodeId, result.dataUrl)
  } catch (err) {
    callbacks.onNodeError(
      nodeId,
      err instanceof Error ? err.message : String(err),
    )
  }
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
  initialInput: ImageData | undefined,
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
  callbacks: RunCallbacks,
  runOptions?: RunOptions,
): Promise<void> {
  await runGraphSlice({
    startNodeId,
    initialInput,
    nodes,
    edges,
    callbacks,
    runOptions,
  })
}

/**
 * Runs every non-batch input node's chain in sequence.
 * Each input is processed independently end-to-end so that multiple inputs
 * feeding the same downstream node each get their turn.
 */
export async function runWorkflow(
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
  callbacks: RunCallbacks,
  runOptions?: RunOptions,
): Promise<void> {
  const inputNodes = nodes.filter(
    (n) => n.data.kind === 'inputNode' && n.data.src && !n.data.batch,
  )
  for (const inputNode of inputNodes) {
    await runFromNode(inputNode.id, undefined, nodes, edges, callbacks, runOptions)
  }
}
