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
  const upstreamEdges = edges.filter((e) => e.target === nodeId)
  const upstreamId = upstreamEdges[0]?.source
  const hasValidInput = upstreamEdges.some((e) => {
    const s = results[e.source]?.status
    return s === 'done' || s === 'skipped'
  })

  return { result, upstreamId, hasValidInput }
}
