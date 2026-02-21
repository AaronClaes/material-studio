import { useEdges, useReactFlow } from '@xyflow/react'
import { IconPalette } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioNode } from '@/types/studio'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  useActiveWorkflowActions,
  useActiveWorkflowIsRunning,
  useActiveWorkflowResults,
} from '@/lib/workflow-store'

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, onChange }: SliderRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs text-muted-foreground">{value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="h-4"
      />
    </div>
  )
}

export function ColorNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'color') return null

  const { setNodes, updateNodeData } = useReactFlow()
  const edges = useEdges()
  const results = useActiveWorkflowResults()
  const isRunning = useActiveWorkflowIsRunning()
  const { runNode, runNodesFrom } = useActiveWorkflowActions()

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
  }

  function toggleDisabled() {
    updateNodeData(id, { disabled: !data.disabled })
  }

  return (
    <BaseNode
      label={data.label}
      icon={<IconPalette size={14} />}
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
    >
      <div className="space-y-2.5">
        <SliderRow
          label="Brightness"
          value={data.brightness}
          min={-100}
          max={100}
          onChange={(v) => update({ brightness: v })}
        />
        <SliderRow
          label="Contrast"
          value={data.contrast}
          min={-100}
          max={100}
          onChange={(v) => update({ contrast: v })}
        />
        <SliderRow
          label="Saturation"
          value={data.saturation}
          min={-100}
          max={100}
          onChange={(v) => update({ saturation: v })}
        />
        <SliderRow
          label="Hue"
          value={data.hue}
          min={-180}
          max={180}
          onChange={(v) => update({ hue: v })}
        />
      </div>
    </BaseNode>
  )
}
