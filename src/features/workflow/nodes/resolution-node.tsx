import { IconMaximize } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { ResolutionNodeData, StudioNode } from '@/features/workflow/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useActiveWorkflowActions,
  useActiveWorkflowIsRunning,
} from '@/features/workflow/store/workflow-store'
import { useNodeConnection } from '@/features/workflow/hooks/use-node-connection'
import { useNodeUpdater } from '@/features/workflow/hooks/use-node-updater'

export function ResolutionNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'resolution') return null

  const isRunning = useActiveWorkflowIsRunning()
  const { runNode, runNodesFrom } = useActiveWorkflowActions()
  const { result, hasValidInput } = useNodeConnection(id)
  const { update, toggleDisabled } = useNodeUpdater<ResolutionNodeData>(id, {
    live: false,
    hasValidInput,
    isRunning,
  })

  return (
    <BaseNode
      label={data.label}
      icon={<IconMaximize size={14} />}
      selected={selected}
      nodeStatus={result?.status}
      resultPreview={result?.outputDataUrl}
      nodeError={result?.error}
      isRunning={isRunning}
      hasValidInput={hasValidInput}
      disabled={data.disabled}
      onToggleDisabled={() => toggleDisabled(data.disabled ?? false)}
      onRun={() => runNode(id)}
      onRunNodes={() => runNodesFrom(id)}
      nodeId={id}
    >
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Width</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={data.width}
              onChange={(e) => update({ width: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Height</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={data.height}
              onChange={(e) => update({ height: Number(e.target.value) })}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            checked={data.maintainAspect}
            onChange={(e) => update({ maintainAspect: e.target.checked })}
          />
          Maintain aspect ratio
        </label>
      </div>
    </BaseNode>
  )
}
