import { useDirectoryStore } from '@/shared/stores/directory-store'
import type { ExecutionResults, StudioEdge, StudioNode } from '@/features/workflow/types'
import type { RunResultItem } from '../lib/run-store'

/**
 * Saves completed output nodes directly to their configured directory.
 * `filter` limits which node IDs are considered (pass the set of nodes that
 * just ran so stale results from earlier runs are never re-saved).
 */
export async function saveOutputNodes(
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
  results: ExecutionResults,
  filter: Set<string>,
  stemOverride?: string,
): Promise<void> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const incomingEdge = new Map<string, string>()
  for (const edge of edges) {
    if (!incomingEdge.has(edge.target))
      incomingEdge.set(edge.target, edge.source)
  }

  function findUpstreamInputStem(outputId: string): string {
    let currentId: string | undefined = outputId
    while (currentId) {
      const n = nodeMap.get(currentId)
      if (n?.data.kind === 'inputNode') return n.data.srcFilename ?? ''
      currentId = incomingEdge.get(currentId)
    }
    return ''
  }

  for (const node of nodes) {
    if (!filter.has(node.id)) continue
    if (node.data.kind !== 'outputNode' || node.data.disabled) continue
    const result = results[node.id]
    if (result?.status !== 'done' || !result.outputDataUrl) continue
    const dirHandle = useDirectoryStore.getState().handles[node.id]
    if (!dirHandle) continue
    const stem =
      stemOverride !== undefined ? stemOverride : findUpstreamInputStem(node.id)
    const outputStem = (node.data.filename || 'output').replace('{name}', stem)
    const filename = `${outputStem}.${node.data.format}`
    try {
      const response = await fetch(result.outputDataUrl)
      const blob = await response.blob()
      const fh = await dirHandle.getFileHandle(filename, { create: true })
      const writable = await fh.createWritable()
      await writable.write(blob)
      await writable.close()
    } catch (err) {
      console.error(`Failed to save ${filename}:`, err)
    }
  }
}

export function buildRunItems(
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
  results: ExecutionResults,
): Array<RunResultItem> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const incomingEdge = new Map<string, string>()
  for (const edge of edges) {
    if (!incomingEdge.has(edge.target))
      incomingEdge.set(edge.target, edge.source)
  }
  const hasOutgoing = new Set(edges.map((e) => e.source))

  const leafNodes = nodes.filter(
    (n) => !hasOutgoing.has(n.id) && results[n.id]?.status === 'done',
  )

  return leafNodes.map((leaf) => {
    const chain: RunResultItem['chain'] = []
    let currentId: string | undefined = leaf.id
    while (currentId) {
      const n = nodeMap.get(currentId)
      if (!n) break
      const { src: _src, ...dataWithoutSrc } = n.data as Record<string, unknown>
      chain.unshift({
        nodeId: currentId,
        nodeData: dataWithoutSrc as RunResultItem['chain'][number]['nodeData'],
        outputDataUrl: results[currentId]?.outputDataUrl ?? null,
      })
      currentId = incomingEdge.get(currentId)
    }
    return {
      outputNodeId: leaf.id,
      outputDataUrl: results[leaf.id]?.outputDataUrl ?? null,
      inputFilename: '',
      inputNodeId: '',
      chain,
    }
  })
}
