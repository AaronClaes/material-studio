import { useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useActiveWorkflowActions } from '@/lib/workflow-store'

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

  function update(patch: Partial<T>) {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    )
    if (options.live && options.hasValidInput && !options.isRunning) {
      if (liveTimer.current) clearTimeout(liveTimer.current)
      liveTimer.current = setTimeout(() => runNode(nodeId), 200)
    }
  }

  function toggleDisabled(current: boolean) {
    updateNodeData(nodeId, { disabled: !current })
  }

  function toggleLive(current: boolean) {
    updateNodeData(nodeId, { live: !current })
  }

  return { update, toggleDisabled, toggleLive }
}
