import { useCallback, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useActiveWorkflowActions } from '@/features/workflow/store/workflow-store'

export function useNodeUpdater<T extends object>(
  nodeId: string,
  options: {
    live?: boolean
    hasValidInput: boolean
    isRunning: boolean
  },
): {
  update: (patch: Partial<T>) => void
  toggleDisabled: (current: boolean) => void
  toggleLive: (current: boolean) => void
} {
  const { setNodes, updateNodeData } = useReactFlow()
  const { runNode } = useActiveWorkflowActions()
  const liveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const update = useCallback(
    (patch: Partial<T>) => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
        ),
      )
      const { live, hasValidInput, isRunning } = optionsRef.current
      if (live && hasValidInput && !isRunning) {
        if (liveTimer.current) clearTimeout(liveTimer.current)
        liveTimer.current = setTimeout(() => runNode(nodeId), 200)
      }
    },
    [nodeId, setNodes, runNode],
  )

  const toggleDisabled = useCallback(
    (current: boolean) => updateNodeData(nodeId, { disabled: !current }),
    [nodeId, updateNodeData],
  )

  const toggleLive = useCallback(
    (current: boolean) => updateNodeData(nodeId, { live: !current }),
    [nodeId, updateNodeData],
  )

  return { update, toggleDisabled, toggleLive }
}
