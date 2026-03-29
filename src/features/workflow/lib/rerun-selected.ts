import type { RunMeta } from '@/shared/lib/run-history-types'
import type { RunResultItem, RunChainStep } from '@/features/workflow/lib/run-store'
import type { StudioNodeData, StudioNode, StudioEdge } from '@/features/workflow/types'
import { runFromNode, type RunCallbacks } from '@/features/workflow/lib/execution'
import { loadRunCoverUrl } from '@/shared/lib/image-opfs'

export interface RerunProgress {
  current: number
  total: number
}

export interface RerunParams {
  selectedMeta: RunMeta
  selectedGroupKeys: Set<string>
  draftSettings: Map<string, StudioNodeData>
  fileMap: Record<string, string>
  onProgress?: (progress: RerunProgress) => void
  abortSignal?: AbortSignal
}

/**
 * Reruns selected result groups from a historical run using (potentially modified)
 * node settings. Reconstructs a synthetic graph from each chain and executes it.
 *
 * Returns hydrated RunResultItem[] for preview.
 */
export async function rerunSelectedGroups(
  params: RerunParams,
): Promise<Array<RunResultItem>> {
  const {
    selectedMeta,
    selectedGroupKeys,
    draftSettings,
    fileMap,
    onProgress,
    abortSignal,
  } = params

  // Collect items belonging to selected groups
  const selectedItems = selectedMeta.items.filter((item) => {
    const key = `${item.inputNodeId}|${item.inputFilename}`
    return selectedGroupKeys.has(key)
  })

  const total = selectedItems.length
  const results: Array<RunResultItem> = []
  let current = 0

  for (const item of selectedItems) {
    if (abortSignal?.aborted) break

    current++
    onProgress?.({ current, total })

    // Load the input image from stored files
    const inputStep = item.chain[0]
    if (!inputStep) continue

    const inputDataUrl = inputStep.storedFile
      ? (fileMap[inputStep.storedFile] ?? await loadRunCoverUrl(inputStep.storedFile))
      : null

    if (!inputDataUrl) {
      console.error('Could not load input image for rerun:', item.inputFilename)
      continue
    }

    // Reconstruct synthetic nodes from the chain, applying draft settings
    const syntheticNodes: Array<StudioNode> = item.chain.map((step) => ({
      id: step.nodeId,
      type: step.nodeData.kind,
      position: { x: 0, y: 0 },
      data: {
        ...(draftSettings.get(step.nodeId) ?? step.nodeData),
        // Ensure input node has the loaded src
        ...(step.nodeId === item.chain[0]!.nodeId
          ? { src: inputDataUrl }
          : {}),
      },
    }))

    // Reconstruct linear edges from chain order
    const syntheticEdges: Array<StudioEdge> = []
    for (let i = 0; i < item.chain.length - 1; i++) {
      syntheticEdges.push({
        id: `retry-edge-${i}`,
        source: item.chain[i]!.nodeId,
        target: item.chain[i + 1]!.nodeId,
      })
    }

    // Collect execution results via callbacks
    const nodeResults = new Map<string, string>()
    const callbacks: RunCallbacks = {
      onNodeStart: () => {},
      onNodeDone: (id, dataUrl) => {
        nodeResults.set(id, dataUrl)
      },
      onNodeError: (id, error) => {
        console.error(`Retry execution error on node ${id}:`, error)
      },
      onNodeSkipped: (id, dataUrl) => {
        nodeResults.set(id, dataUrl)
      },
    }

    try {
      const startNodeId = item.chain[0]!.nodeId
      await runFromNode(
        startNodeId,
        undefined, // input loaded via src on the input node data
        syntheticNodes,
        syntheticEdges,
        callbacks,
      )

      // Build the result item
      const lastStep = item.chain.at(-1)
      const outputDataUrl = lastStep
        ? (nodeResults.get(lastStep.nodeId) ?? null)
        : null

      const chain: Array<RunChainStep> = item.chain.map((step) => ({
        nodeId: step.nodeId,
        nodeData: draftSettings.get(step.nodeId) ?? step.nodeData,
        outputDataUrl: nodeResults.get(step.nodeId) ?? null,
      }))

      results.push({
        outputNodeId: item.outputNodeId,
        outputDataUrl,
        inputFilename: item.inputFilename,
        inputNodeId: item.inputNodeId,
        chain,
      })
    } catch (err) {
      console.error('Failed to rerun item:', item.inputFilename, err)
    }
  }

  return results
}
