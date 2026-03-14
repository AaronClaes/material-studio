import type {
  ExecutionResults,
  StudioEdge,
  StudioNode,
} from '@/features/workflow/types'
import type { RunResultItem } from '../lib/run-store'
import { useDirectoryStore } from '@/shared/stores/directory-store'
import { uploadFileToDrive, useGoogleAuthStore } from '@/features/google-drive'

function buildIncomingEdgeMap(edges: Array<StudioEdge>): Map<string, string> {
  const map = new Map<string, string>()
  for (const edge of edges) {
    if (!map.has(edge.target)) map.set(edge.target, edge.source)
  }
  return map
}

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
  const incomingEdge = buildIncomingEdgeMap(edges)

  function findUpstreamInputStem(outputId: string): string {
    let currentId: string | undefined = outputId
    while (currentId) {
      const n = nodeMap.get(currentId)
      if (n?.data.kind === 'inputNode' || n?.data.kind === 'googleDriveInputNode')
        return n.data.srcFilename ?? ''
      currentId = incomingEdge.get(currentId)
    }
    return ''
  }

  for (const node of nodes) {
    if (!filter.has(node.id)) continue
    if (node.data.disabled) continue

    const result = results[node.id]
    if (result?.status !== 'done') continue

    const stem =
      stemOverride !== undefined ? stemOverride : findUpstreamInputStem(node.id)

    if (node.data.kind === 'outputNode') {
      const dirHandle = useDirectoryStore.getState().handles[node.id]
      if (!dirHandle) continue

      const outputStem = (node.data.filename || 'output').replace('{name}', stem)
      const dataUrls = result.allOutputDataUrls?.length
        ? result.allOutputDataUrls
        : result.outputDataUrl
          ? [result.outputDataUrl]
          : []

      for (let i = 0; i < dataUrls.length; i++) {
        const dataUrl = dataUrls[i]!
        const filename =
          dataUrls.length === 1
            ? `${outputStem}.${node.data.format}`
            : `${outputStem}-${i + 1}.${node.data.format}`
        try {
          const response = await fetch(dataUrl)
          const blob = await response.blob()
          const fh = await dirHandle.getFileHandle(filename, { create: true })
          const writable = await fh.createWritable()
          await writable.write(blob)
          await writable.close()
        } catch (err) {
          console.error(`Failed to save ${filename}:`, err)
        }
      }
    } else if (node.data.kind === 'googleDriveOutputNode') {
      const { folderId } = node.data
      if (!folderId) continue
      const accessToken = useGoogleAuthStore.getState().accessToken
      if (!accessToken) continue

      const outputStem = (node.data.filename || 'output').replace('{name}', stem)
      const dataUrls = result.allOutputDataUrls?.length
        ? result.allOutputDataUrls
        : result.outputDataUrl
          ? [result.outputDataUrl]
          : []

      const mimeMap = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }
      const mimeType = mimeMap[node.data.format]

      for (let i = 0; i < dataUrls.length; i++) {
        const dataUrl = dataUrls[i]!
        const filename =
          dataUrls.length === 1
            ? `${outputStem}.${node.data.format}`
            : `${outputStem}-${i + 1}.${node.data.format}`
        try {
          const response = await fetch(dataUrl)
          const blob = await response.blob()
          await uploadFileToDrive(accessToken, folderId, filename, new Blob([blob], { type: mimeType }))
        } catch (err) {
          console.error(`Failed to upload ${filename} to Google Drive:`, err)
        }
      }
    }
  }
}

export function buildRunItems(
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
  results: ExecutionResults,
): Array<RunResultItem> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const incomingEdge = buildIncomingEdgeMap(edges)
  const hasOutgoing = new Set(edges.map((e) => e.source))

  const leafNodes = nodes.filter(
    (n) => !hasOutgoing.has(n.id) && results[n.id]?.status === 'done',
  )

  return leafNodes.flatMap((leaf) => {
    const leafResult = results[leaf.id]
    const dataUrls = leafResult?.allOutputDataUrls?.length
      ? leafResult.allOutputDataUrls
      : leafResult?.outputDataUrl
        ? [leafResult.outputDataUrl]
        : []

    return dataUrls.map((dataUrl) => {
      const chain: RunResultItem['chain'] = []
      let currentId: string | undefined = leaf.id
      while (currentId) {
        const n = nodeMap.get(currentId)
        if (!n) break
        const { src: _src, ...dataWithoutSrc } = n.data as Record<
          string,
          unknown
        >
        chain.unshift({
          nodeId: currentId,
          nodeData:
            dataWithoutSrc as RunResultItem['chain'][number]['nodeData'],
          outputDataUrl: results[currentId]?.outputDataUrl ?? null,
        })
        currentId = incomingEdge.get(currentId)
      }
      return {
        outputNodeId: leaf.id,
        outputDataUrl: dataUrl,
        inputFilename: '',
        inputNodeId: '',
        chain,
      }
    })
  })
}
