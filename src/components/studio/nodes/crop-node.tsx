import { IconCrop } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { CropNodeData, StudioNode } from '@/types/studio'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useActiveWorkflowActions,
  useActiveWorkflowIsRunning,
} from '@/lib/workflow-store'
import { useNodeConnection } from '@/hooks/use-node-connection'
import { useNodeUpdater } from '@/hooks/use-node-updater'

export function CropNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'crop') return null

  const isRunning = useActiveWorkflowIsRunning()
  const { runNode, runNodesFrom } = useActiveWorkflowActions()
  const { result, hasValidInput } = useNodeConnection(id)
  const { update, toggleDisabled } = useNodeUpdater<CropNodeData>(id, {
    live: false,
    hasValidInput,
    isRunning,
  })

  return (
    <BaseNode
      label={data.label}
      icon={<IconCrop size={14} />}
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
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        {(
          [
            ['x', 'X', data.x],
            ['y', 'Y', data.y],
            ['width', 'W', data.width],
            ['height', 'H', data.height],
          ] as const
        ).map(([key, lbl, val]) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{lbl}</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={val}
              onChange={(e) => update({ [key]: Number(e.target.value) })}
            />
          </div>
        ))}
      </div>
    </BaseNode>
  )
}
