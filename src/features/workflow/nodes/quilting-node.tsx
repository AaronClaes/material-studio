import { IconTexture } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import { SliderRow } from './slider-row'
import type { NodeProps } from '@xyflow/react'
import type { QuiltingNodeData, StudioNode } from '@/features/workflow/types'
import {
  useActiveWorkflowActions,
  useActiveWorkflowIsRunning,
} from '@/features/workflow/store/workflow-store'
import { useNodeConnection } from '@/features/workflow/hooks/use-node-connection'
import { useNodeUpdater } from '@/features/workflow/hooks/use-node-updater'

export function QuiltingNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'quilting') return null

  const isRunning = useActiveWorkflowIsRunning()
  const { runNode, runNodesFrom } = useActiveWorkflowActions()
  const { result, hasValidInput } = useNodeConnection(id)
  const { update, toggleDisabled } = useNodeUpdater<QuiltingNodeData>(id, {
    live: false,
    hasValidInput,
    isRunning,
  })

  return (
    <BaseNode
      label={data.label}
      icon={<IconTexture size={14} />}
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
      <div className="space-y-2.5">
        <SliderRow
          label="Width"
          value={data.outputWidth}
          min={64}
          max={4096}
          step={64}
          defaultValue={1024}
          onChange={(v) => update({ outputWidth: v })}
        />
        <SliderRow
          label="Height"
          value={data.outputHeight}
          min={64}
          max={4096}
          step={64}
          defaultValue={1024}
          onChange={(v) => update({ outputHeight: v })}
        />
        <SliderRow
          label="Patch Size"
          value={data.patchSize}
          min={8}
          max={256}
          step={4}
          defaultValue={64}
          onChange={(v) => update({ patchSize: v })}
        />
        <SliderRow
          label="Overlap %"
          value={Math.round(data.overlapFraction * 100)}
          min={5}
          max={50}
          step={1}
          defaultValue={17}
          onChange={(v) => update({ overlapFraction: v / 100 })}
        />
        <SliderRow
          label="Tolerance"
          value={data.errorTolerance}
          min={1.0}
          max={5.0}
          step={0.1}
          defaultValue={1.5}
          onChange={(v) => update({ errorTolerance: v })}
        />
        <SliderRow
          label="Seed"
          value={data.seed}
          min={0}
          max={9999}
          step={1}
          defaultValue={42}
          onChange={(v) => update({ seed: v })}
        />
      </div>
    </BaseNode>
  )
}
