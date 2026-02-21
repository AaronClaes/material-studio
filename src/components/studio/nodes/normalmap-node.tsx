import { useRef, useState } from 'react'
import { useEdges, useReactFlow } from '@xyflow/react'
import { IconRefresh, IconVectorTriangle } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioNode } from '@/types/studio'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  step: number
  defaultValue?: number
  onChange: (v: number) => void
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  defaultValue = 0,
  onChange,
}: SliderRowProps) {
  const [draft, setDraft] = useState<string | null>(null)

  function commit(raw: string) {
    setDraft(null)
    const parsed = step < 1
      ? parseFloat(Number(raw).toFixed(1))
      : Math.round(Number(raw))
    if (!Number.isFinite(parsed)) return
    onChange(Math.max(min, Math.min(max, parsed)))
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <Label className="text-xs">{label}</Label>
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            disabled={value === defaultValue}
            className="text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-0 disabled:pointer-events-none transition-opacity"
          >
            <IconRefresh size={10} />
          </button>
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={draft ?? value}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(e.currentTarget.value)
            if (e.key === 'Escape') setDraft(null)
            e.stopPropagation()
          }}
          className="w-10 text-xs text-right tabular-nums text-muted-foreground bg-transparent border-0 outline-none p-0 focus:text-foreground"
        />
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="h-4"
      />
    </div>
  )
}

export function NormalmapNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'normalmap') return null

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

  // Derive toggle group value from the three invert booleans
  const invertValues = [
    data.invertR && 'R',
    data.invertG && 'G',
    data.invertHeight && 'Height',
  ].filter(Boolean) as string[]

  function handleInvertChange(values: string[]) {
    update({
      invertR: values.includes('R'),
      invertG: values.includes('G'),
      invertHeight: values.includes('Height'),
    })
  }

  return (
    <BaseNode
      label={data.label}
      icon={<IconVectorTriangle size={14} />}
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
          label="Strength"
          value={data.strength}
          min={0}
          max={5}
          step={0.1}
          defaultValue={1}
          onChange={(v) => update({ strength: v })}
        />
        <SliderRow
          label="Level"
          value={data.level}
          min={4}
          max={10}
          step={1}
          defaultValue={7}
          onChange={(v) => update({ level: v })}
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

        <div className="space-y-1">
          <Label className="text-xs">Filter</Label>
          <Select
            value={data.filter}
            onValueChange={(v) => update({ filter: v as 'sobel' | 'scharr' })}
          >
            <SelectTrigger className="h-7 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sobel" className="text-xs">Sobel</SelectItem>
              <SelectItem value="scharr" className="text-xs">Scharr</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-border/50 pt-2 space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Invert</Label>
            <ToggleGroup
              type="multiple"
              variant="outline"
              size="sm"
              value={invertValues}
              onValueChange={handleInvertChange}
              className="w-full"
            >
              {(['R', 'G', 'Height'] as const).map((v) => (
                <ToggleGroupItem key={v} value={v} className="flex-1 text-xs h-7">
                  {v}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox
              checked={data.zRange}
              onCheckedChange={(checked) => update({ zRange: checked === true })}
            />
            Z Range −1 to +1
          </label>
        </div>
      </div>
    </BaseNode>
  )
}
