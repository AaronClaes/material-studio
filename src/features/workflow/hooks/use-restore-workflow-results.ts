import { useEffect } from 'react'
import { useWorkflowStore } from '../store/workflow-store'
import { loadAllWorkflowResults } from '@/shared/lib/image-opfs'

export function useRestoreWorkflowResults(workflowId: string) {
  const setResults = useWorkflowStore((s) => s.setResults)
  const hasResults = useWorkflowStore(
    (s) =>
      Object.keys(s.workflows.find((w) => w.id === workflowId)?.results ?? {})
        .length > 0,
  )

  useEffect(() => {
    if (hasResults) return
    loadAllWorkflowResults(workflowId).then((results) => {
      if (Object.keys(results).length === 0) return
      const structured = Object.fromEntries(
        Object.entries(results).map(([nodeId, url]) => [
          nodeId,
          { status: 'done' as const, outputDataUrl: url, error: null },
        ]),
      )
      setResults(workflowId, structured)
    })
  }, [workflowId])
}
