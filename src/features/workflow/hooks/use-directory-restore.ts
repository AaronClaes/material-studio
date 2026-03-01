import { useEffect } from 'react'
import { readDirectoryPreview, useDirectoryStore } from '@/shared/stores/directory-store'
import { useWorkflowStore } from '@/features/workflow/store/workflow-store'

export function useDirectoryRestore() {
  const restoreHandles = useDirectoryStore((s) => s.restoreHandles)
  const patchNodeData = useWorkflowStore((s) => s.patchNodeData)

  useEffect(() => {
    const workflows = useWorkflowStore.getState().workflows
    const allNodes = workflows.flatMap((w) => w.nodes)
    const dirNodeIds = allNodes
      .filter(
        (n) =>
          (n.data.kind === 'inputNode' && n.data.batch) ||
          n.data.kind === 'outputNode',
      )
      .map((n) => n.id)
    if (dirNodeIds.length === 0) return

    const nodeById = Object.fromEntries(allNodes.map((n) => [n.id, n]))
    const workflowByNode = Object.fromEntries(
      workflows.flatMap((w) => w.nodes.map((n) => [n.id, w.id])),
    )

    restoreHandles(dirNodeIds, (nodeId) =>
      nodeById[nodeId]?.data.kind === 'outputNode' ? 'readwrite' : 'read',
    ).then(() => {
      const handles = useDirectoryStore.getState().handles
      for (const nodeId of dirNodeIds) {
        const node = nodeById[nodeId]
        if (!node) continue
        if (node.data.kind !== 'inputNode') continue
        const handle = handles[nodeId]
        if (!handle) continue
        const wfId = workflowByNode[nodeId]
        if (!wfId) continue
        readDirectoryPreview(handle).then((preview) => {
          patchNodeData(wfId, nodeId, {
            ...preview,
            processedCount: 0,
          })
        })
      }
    })
    // Only restore once on mount
  }, [])
}
