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

/**
 * Result of processing a single node.
 * `dataUrl` is only set for outputNode; all others expose `imageData` for
 * passing downstream. This keeps the processor boundary explicit and makes it
 * straightforward to add new node kinds.
 */
type NodeProcessResult =
  | { kind: 'image'; imageData: ImageData; dataUrl: string }
  | { kind: 'output'; imageData: ImageData; dataUrl: string }

async function processNode(
  data: StudioNodeData,
  input: ImageData | undefined,
): Promise<NodeProcessResult> {
  if (data.kind === 'inputNode' || data.kind === 'batchInputNode') {
    if (!data.src) throw new Error('No image selected')
    const imageData = await processInputNode(data.src)
    return { kind: 'image', imageData, dataUrl: imageDataToDataUrl(imageData) }
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

  // outputNode
  const result = await processOutputNode(input, { format: data.format })
  return { kind: 'output', imageData: result.imageData, dataUrl: result.dataUrl }
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
): Promise<void> {
  for (const id of order) {
    const node = nodeMap.get(id)
    if (!node) continue

    // Skip disabled nodes — thread upstream data through unchanged
    if (node.data.kind !== 'inputNode' && node.data.disabled) {
      const upstreamId = incomingEdge.get(id)
      const upstreamData = upstreamId ? outputs.get(upstreamId) : undefined
      if (upstreamData) {
        outputs.set(id, upstreamData)
        callbacks.onNodeSkipped(id, imageDataToDataUrl(upstreamData))
      }
      continue
    }

    callbacks.onNodeStart(id)

    try {
      const upstreamId = incomingEdge.get(id)
      const input = upstreamId ? outputs.get(upstreamId) : undefined
      const result = await processNode(node.data, input)
      outputs.set(id, result.imageData)
      callbacks.onNodeDone(id, result.dataUrl)
    } catch (err) {
      callbacks.onNodeError(id, err instanceof Error ? err.message : String(err))
    }
  }
}

function buildIncomingEdgeMap(edges: Array<StudioEdge>): Map<string, string> {
  const map = new Map<string, string>()
  for (const edge of edges) {
    map.set(edge.target, edge.source)
  }
  return map
}

export async function runSingleNode(
  nodeId: string,
  input: ImageData,
  nodes: Array<StudioNode>,
  callbacks: RunCallbacks,
): Promise<void> {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return

  callbacks.onNodeStart(nodeId)

  try {
    const result = await processNode(node.data, input)
    callbacks.onNodeDone(nodeId, result.dataUrl)
  } catch (err) {
    callbacks.onNodeError(nodeId, err instanceof Error ? err.message : String(err))
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
): Promise<void> {
  const downstreamIds = getDownstreamIds(startNodeId, edges)
  const downstreamNodes = nodes.filter((n) => downstreamIds.has(n.id))
  const downstreamEdges = edges.filter(
    (e) => downstreamIds.has(e.source) && downstreamIds.has(e.target),
  )

  const order = topoSort(downstreamNodes, downstreamEdges)
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const incomingEdge = buildIncomingEdgeMap(edges)
  const outputs = new Map<string, ImageData>()

  // Pre-seed the upstream output so startNodeId can find its input
  const upstreamId = incomingEdge.get(startNodeId)
  if (upstreamId && initialInput) {
    outputs.set(upstreamId, initialInput)
  }

  await executeOrder(order, nodeMap, incomingEdge, outputs, callbacks)
}

function getReachableFromInputs(
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
): Set<string> {
  const adj = new Map<string, Array<string>>()
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, [])
    adj.get(edge.source)!.push(edge.target)
  }

  const visited = new Set<string>()
  const queue = nodes
    .filter((n) => n.data.kind === 'inputNode' && n.data.src)
    .map((n) => n.id)

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

export async function runWorkflow(
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
  callbacks: RunCallbacks,
): Promise<void> {
  const reachable = getReachableFromInputs(nodes, edges)
  const reachableNodes = nodes.filter((n) => reachable.has(n.id))
  const reachableEdges = edges.filter(
    (e) => reachable.has(e.source) && reachable.has(e.target),
  )
  const order = topoSort(reachableNodes, reachableEdges)
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const incomingEdge = buildIncomingEdgeMap(edges)
  const outputs = new Map<string, ImageData>()

  await executeOrder(order, nodeMap, incomingEdge, outputs, callbacks)
}
