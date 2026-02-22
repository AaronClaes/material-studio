import { IconArrowsMoveVertical } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import { SliderRow } from './slider-row'
import type { NodeProps } from '@xyflow/react'
import type { DisplacementNodeData, StudioNode } from '@/types/studio'
import { Checkbox } from '@/components/ui/checkbox'
import {
  useActiveWorkflowActions,
  useActiveWorkflowIsRunning,
} from '@/lib/workflow-store'
import { useNodeConnection } from '@/hooks/use-node-connection'
import { useNodeUpdater } from '@/hooks/use-node-updater'

export function DisplacementNode({
  id,
  data,
  selected,
}: NodeProps<StudioNode>) {
  if (data.kind !== 'displacement') return null

  const isRunning = useActiveWorkflowIsRunning()
  const { runNode, runNodesFrom } = useActiveWorkflowActions()
  const { result, hasValidInput } = useNodeConnection(id)
  const { update, toggleDisabled, toggleLive } =
    useNodeUpdater<DisplacementNodeData>(id, {
      live: data.live,
      hasValidInput,
      isRunning,
    })

  return (
    <BaseNode
      label={data.label}
      icon={<IconArrowsMoveVertical size={14} />}
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
      liveMode={data.live}
      onToggleLive={() => toggleLive(data.live ?? false)}
      nodeId={id}
    >
      <div className="space-y-2.5">
        <SliderRow
          label="Contrast"
          value={data.contrast}
          min={-1}
          max={1}
          step={0.01}
          defaultValue={0}
          onChange={(v) => update({ contrast: v })}
        />
        <SliderRow
          label="Blur / Sharp"
          value={data.blurSharp}
          min={-32}
          max={32}
          step={1}
          defaultValue={0}
          onChange={(v) => update({ blurSharp: v })}
        />

        <div className="border-t border-border/50 pt-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox
              checked={data.invert}
              onCheckedChange={(checked) =>
                update({ invert: checked === true })
              }
            />
            Invert
          </label>
        </div>
      </div>
    </BaseNode>
  )
}
