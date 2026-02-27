import { IconBrightnessDown } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import { SliderRow } from './slider-row'
import type { NodeProps } from '@xyflow/react'
import type { AomapNodeData, StudioNode } from '@/features/workflow/types'
import { Checkbox } from '@/components/ui/checkbox'
import {
  useActiveWorkflowActions,
  useActiveWorkflowIsRunning,
} from '@/features/workflow/store/workflow-store'
import { useNodeConnection } from '@/features/workflow/hooks/use-node-connection'
import { useNodeUpdater } from '@/features/workflow/hooks/use-node-updater'

export function AomapNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'aomap') return null

  const isRunning = useActiveWorkflowIsRunning()
  const { runNode, runNodesFrom } = useActiveWorkflowActions()
  const { result, hasValidInput } = useNodeConnection(id)
  const { update, toggleDisabled, toggleLive } = useNodeUpdater<AomapNodeData>(
    id,
    { live: data.live, hasValidInput, isRunning },
  )

  return (
    <BaseNode
      label={data.label}
      icon={<IconBrightnessDown size={14} />}
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
          label="Strength"
          value={data.strength}
          min={0}
          max={1}
          step={0.01}
          defaultValue={1}
          onChange={(v) => update({ strength: v })}
        />
        <SliderRow
          label="Mean"
          value={data.mean}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.5}
          onChange={(v) => update({ mean: v })}
        />
        <SliderRow
          label="Range"
          value={data.range}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.5}
          onChange={(v) => update({ range: v })}
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
