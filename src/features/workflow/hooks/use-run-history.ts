import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WorkflowRun } from '@/features/workflow/lib/run-store'
import type { RunMeta } from '@/shared/lib/run-history-types'
import { deleteRunFromHistory, loadRunFiles } from '@/shared/lib/image-opfs'
import { useRunHistoryStore } from '@/features/workflow/store/run-history-store'

function hydrateRun(
  meta: RunMeta,
  fileMap: Record<string, string>,
): WorkflowRun {
  return {
    id: meta.id,
    name: meta.name,
    workflowId: meta.workflowId,
    completedAt: meta.completedAt,
    durationMs: meta.durationMs,
    items: meta.items.map((item) => ({
      outputNodeId: item.outputNodeId,
      outputDataUrl: item.storedFile ? fileMap[item.storedFile] : null,
      inputFilename: item.inputFilename,
      inputNodeId: item.inputNodeId,
      chain: item.chain.map((step) => ({
        nodeId: step.nodeId,
        nodeData: step.nodeData,
        outputDataUrl: step.storedFile ? fileMap[step.storedFile] : null,
      })),
    })),
  }
}

export function useRunHistory(workflowId: string) {
  const qc = useQueryClient()
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const metaList = useRunHistoryStore((s) => s.history[workflowId])
  const storeDeleteRun = useRunHistoryStore((s) => s.deleteRun)
  const storeRenameRun = useRunHistoryStore((s) => s.renameRun)

  // Auto-select first run when list loads and nothing is selected
  useEffect(() => {
    if (metaList.length > 0 && selectedRunId === null) {
      setSelectedRunId(metaList[0].id)
    }
  }, [metaList, selectedRunId])

  const selectedMeta = metaList.find((m) => m.id === selectedRunId) ?? null

  const { data: fileMap, isLoading: isHydrating } = useQuery({
    queryKey: ['run-files', workflowId, selectedRunId],
    queryFn: () => loadRunFiles(workflowId, selectedRunId!),
    enabled: !!selectedRunId,
  })

  const selectedRun: WorkflowRun | null = useMemo(() => {
    return selectedMeta && fileMap ? hydrateRun(selectedMeta, fileMap) : null
  }, [selectedMeta, fileMap])

  const deleteRun = useMutation({
    mutationFn: (runId: string) => deleteRunFromHistory(workflowId, runId),
    onSuccess: (_data, runId) => {
      storeDeleteRun(workflowId, runId)
      qc.invalidateQueries({ queryKey: ['run-files', workflowId, runId] })
      if (selectedRunId === runId) {
        const next = metaList.find((m) => m.id !== runId)
        setSelectedRunId(next?.id ?? null)
      }
    },
  })

  const renameRun = useMemo(() => {
    return (id: string, name: string) => {
      storeRenameRun(workflowId, id, name)
    }
  }, [workflowId, storeRenameRun])

  return {
    metaList,
    isLoading: false,
    selectedRunId,
    selectRun: setSelectedRunId,
    selectedRun,
    isHydrating,
    deleteRun,
    renameRun,
  }
}
