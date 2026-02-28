import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWorkflowStore } from '../store/workflow-store'
import { loadAllWorkflowResults } from '@/shared/lib/image-opfs'

export function useRestoreWorkflowResults(workflowId: string) {
  const setResults = useWorkflowStore((s) => s.setResults)
  const hasResults = useWorkflowStore(
    (s) =>
      Object.keys(s.workflows.find((w) => w.id === workflowId)?.results ?? {})
        .length > 0,
  )

  const { data } = useQuery({
    queryKey: ['workflow-results', workflowId],
    queryFn: () => loadAllWorkflowResults(workflowId),
    enabled: !!workflowId && !hasResults,
  })

  useEffect(() => {
    if (!data || Object.keys(data).length === 0) return
    const structured = Object.fromEntries(
      Object.entries(data).map(([nodeId, url]) => [
        nodeId,
        { status: 'done' as const, outputDataUrl: url, error: null },
      ]),
    )
    setResults(workflowId, structured)
  }, [data])
}
