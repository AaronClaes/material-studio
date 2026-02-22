import { useRef } from 'react'
import { useEdges, useReactFlow } from '@xyflow/react'
import { IconArrowsMoveVertical } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import { SliderRow } from './slider-row'
import type { NodeProps } from '@xyflow/react'
import type { StudioNode } from '@/types/studio'
import { Checkbox } from '@/components/ui/checkbox'
import {
  useActiveWorkflowActions,
  useActiveWorkflowIsRunning,
  useActiveWorkflowResults,
} from '@/lib/workflow-store'

export function DisplacementNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'displacement') return null

  const { setNodes, updateNodeData } = useReactFlow()
  const edges = useEdges()
  const results = useActiveWorkflowResults()
  const isRunning = useActiveWorkflowIsRunning()
  const { runNode, runNodesFrom } = useActiveWorkflowActions()
  const liveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const result = results[id]
  const upstreamId = edges.find((e) => e.target === id)?.source
  const upstreamResult = upstreamId ? results[upstreamId] : undefined
  const hasValidInput =
    upstreamResult?.status === 'done' || upstreamResult?.status === 'skipped'

  function update(patch: Partial<typeof data>) {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    )
    if (data.live && hasValidInput && !isRunning) {
      if (liveTimer.current) clearTimeout(liveTimer.current)
      liveTimer.current = setTimeout(() => runNode(id), 200)
    }
  }

  function toggleDisabled() {
    updateNodeData(id, { disabled: !data.disabled })
  }

  function toggleLive() {
    updateNodeData(id, { live: !data.live })
  }

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
      onToggleDisabled={toggleDisabled}
      onRun={() => runNode(id)}
      onRunNodes={() => runNodesFrom(id)}
      liveMode={data.live}
      onToggleLive={toggleLive}
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
              onCheckedChange={(checked) => update({ invert: checked === true })}
            />
            Invert
          </label>
        </div>
      </div>
    </BaseNode>
  )
}
