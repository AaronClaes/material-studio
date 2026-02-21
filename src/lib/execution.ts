import {
  imageDataToDataUrl,
  processColorNode,
  processCropNode,
  processInputNode,
  processOutputNode,
  processResolutionNode,
} from './processors'
import type { StudioEdge, StudioNode } from '@/types/studio'

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

interface RunCallbacks {
  onNodeStart: (id: string) => void
  onNodeDone: (id: string, dataUrl: string) => void
  onNodeError: (id: string, error: string) => void
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
    const { data } = node
    let outputData: ImageData

    if (data.kind === 'inputNode') {
      if (!data.src) throw new Error('No image selected')
      outputData = await processInputNode(data.src)
    } else if (data.kind === 'crop') {
      outputData = await processCropNode(input, {
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
      })
    } else if (data.kind === 'resolution') {
      outputData = await processResolutionNode(input, {
        width: data.width,
        height: data.height,
        maintainAspect: data.maintainAspect,
      })
    } else if (data.kind === 'color') {
      outputData = await processColorNode(input, {
        brightness: data.brightness,
        contrast: data.contrast,
        saturation: data.saturation,
        hue: data.hue,
      })
    } else {
      // outputNode
      const result = await processOutputNode(input, { format: data.format })
      callbacks.onNodeDone(nodeId, result.dataUrl)
      return
    }

    callbacks.onNodeDone(nodeId, imageDataToDataUrl(outputData))
  } catch (err) {
    callbacks.onNodeError(nodeId, err instanceof Error ? err.message : String(err))
  }
}

export async function runFromNode(
  startNodeId: string,
  initialInput: ImageData,
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
  callbacks: RunCallbacks,
): Promise<void> {
  const order = topoSort(nodes, edges)
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const outputs = new Map<string, ImageData>()

  const incomingEdge = new Map<string, string>()
  for (const edge of edges) {
    incomingEdge.set(edge.target, edge.source)
  }

  // Pre-seed the upstream output so startNodeId can find its input
  const upstreamId = incomingEdge.get(startNodeId)
  if (upstreamId) {
    outputs.set(upstreamId, initialInput)
  }

  const startIndex = order.indexOf(startNodeId)
  if (startIndex === -1) return
  const slice = order.slice(startIndex)

  for (const id of slice) {
    const node = nodeMap.get(id)
    if (!node) continue

    callbacks.onNodeStart(id)

    try {
      const { data } = node
      let outputData: ImageData

      if (data.kind === 'inputNode') {
        if (!data.src) throw new Error('No image selected')
        outputData = await processInputNode(data.src)
      } else {
        const uid = incomingEdge.get(id)
        const input = uid ? outputs.get(uid) : undefined
        if (!input) throw new Error('No upstream input')

        if (data.kind === 'crop') {
          outputData = await processCropNode(input, {
            x: data.x,
            y: data.y,
            width: data.width,
            height: data.height,
          })
        } else if (data.kind === 'resolution') {
          outputData = await processResolutionNode(input, {
            width: data.width,
            height: data.height,
            maintainAspect: data.maintainAspect,
          })
        } else if (data.kind === 'color') {
          outputData = await processColorNode(input, {
            brightness: data.brightness,
            contrast: data.contrast,
            saturation: data.saturation,
            hue: data.hue,
          })
        } else {
          // outputNode
          const result = await processOutputNode(input, { format: data.format })
          outputData = result.imageData
          outputs.set(id, outputData)
          callbacks.onNodeDone(id, result.dataUrl)
          continue
        }
      }

      outputs.set(id, outputData)
      callbacks.onNodeDone(id, imageDataToDataUrl(outputData))
    } catch (err) {
      callbacks.onNodeError(id, err instanceof Error ? err.message : String(err))
    }
  }
}

export async function runWorkflow(
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
  callbacks: RunCallbacks,
): Promise<void> {
  const order = topoSort(nodes, edges)
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const outputs = new Map<string, ImageData>()

  // Build reverse edge map: target → source (for finding upstream node)
  const incomingEdge = new Map<string, string>()
  for (const edge of edges) {
    incomingEdge.set(edge.target, edge.source)
  }

  for (const id of order) {
    const node = nodeMap.get(id)
    if (!node) continue

    callbacks.onNodeStart(id)

    try {
      const { data } = node
      let outputData: ImageData

      if (data.kind === 'inputNode') {
        if (!data.src) throw new Error('No image selected')
        outputData = await processInputNode(data.src)
      } else {
        const upstreamId = incomingEdge.get(id)
        const input = upstreamId ? outputs.get(upstreamId) : undefined
        if (!input) throw new Error('No upstream input')

        if (data.kind === 'crop') {
          outputData = await processCropNode(input, {
            x: data.x,
            y: data.y,
            width: data.width,
            height: data.height,
          })
        } else if (data.kind === 'resolution') {
          outputData = await processResolutionNode(input, {
            width: data.width,
            height: data.height,
            maintainAspect: data.maintainAspect,
          })
        } else if (data.kind === 'color') {
          outputData = await processColorNode(input, {
            brightness: data.brightness,
            contrast: data.contrast,
            saturation: data.saturation,
            hue: data.hue,
          })
        } else {
          // outputNode
          const result = await processOutputNode(input, { format: data.format })
          outputData = result.imageData
          outputs.set(id, outputData)
          callbacks.onNodeDone(id, result.dataUrl)
          continue
        }
      }

      outputs.set(id, outputData)
      callbacks.onNodeDone(id, imageDataToDataUrl(outputData))
    } catch (err) {
      callbacks.onNodeError(id, err instanceof Error ? err.message : String(err))
    }
  }
}
