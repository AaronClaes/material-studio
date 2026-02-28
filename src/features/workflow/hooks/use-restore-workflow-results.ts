import { useQuery } from '@tanstack/react-query'
import { useWorkflowStore } from '../store/workflow-store'
import { loadAllWorkflowResults } from '@/shared/lib/image-opfs'

export function useRestoreWorkflowResults(workflowId: string) {
  const hasResults = useWorkflowStore(
    (s) =>
      Object.keys(s.workflows.find((w) => w.id === workflowId)?.results ?? {})
        .length > 0,
  )

  useQuery({
    queryKey: ['workflow-results', workflowId],
    queryFn: async () => {
      const data = await loadAllWorkflowResults(workflowId)
      if (Object.keys(data).length === 0) return null
      const structured = Object.fromEntries(
        Object.entries(data).map(([nodeId, url]) => [
          nodeId,
          { status: 'done' as const, outputDataUrl: url, error: null },
        ]),
      )
      useWorkflowStore.getState().setResults(workflowId, structured)
      return null
    },
    enabled: !!workflowId && !hasResults,
  })
}
