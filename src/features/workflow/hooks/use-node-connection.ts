import { useEdges } from '@xyflow/react'
import type { NodeResult } from '@/features/workflow/types'
import { useActiveWorkflowResults } from '@/features/workflow/store/workflow-store'

export function useNodeConnection(nodeId: string): {
  result: NodeResult | undefined
  upstreamId: string | undefined
  hasValidInput: boolean
} {
  const edges = useEdges()
  const results = useActiveWorkflowResults()

  const result = results[nodeId]
  const upstreamId = edges.find((e) => e.target === nodeId)?.source
  const upstreamResult = upstreamId ? results[upstreamId] : undefined
  const hasValidInput =
    upstreamResult?.status === 'done' || upstreamResult?.status === 'skipped'

  return { result, upstreamId, hasValidInput }
}
