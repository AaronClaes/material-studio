import { useRef, useState } from 'react'
import { useEdges, useReactFlow } from '@xyflow/react'
import { IconPalette, IconRefresh } from '@tabler/icons-react'
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
  defaultValue?: number
  onChange: (v: number) => void
}

function SliderRow({
  label,
  value,
  min,
  max,
  defaultValue = 0,
  onChange,
}: SliderRowProps) {
  const [draft, setDraft] = useState<string | null>(null)

  function commit(raw: string) {
    setDraft(null)
    const parsed = Math.round(Number(raw))
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
  const liveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hexDraft, setHexDraft] = useState<string | null>(null)

  const result = results[id]
  const upstreamId = edges.find((e) => e.target === id)?.source
  const upstreamResult = upstreamId ? results[upstreamId] : undefined
  const hasValidInput =
    upstreamResult?.status === 'done' || upstreamResult?.status === 'skipped'

  const tintColor = data.tintColor
  const isDefaultTint = tintColor.toLowerCase() === '#ffffff'

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

  function commitHex(raw: string) {
    setHexDraft(null)
    let hex = raw.trim()
    if (!hex.startsWith('#')) hex = `#${hex}`
    // Expand 3-char shorthand (#rgb → #rrggbb)
    if (/^#[0-9a-f]{3}$/i.test(hex)) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    }
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return // invalid — revert silently
    update({ tintColor: hex.toLowerCase() })
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
      liveMode={data.live}
      onToggleLive={toggleLive}
    >
      <div className="space-y-2.5">
        {/* Tint color — multiplicative, like Three.js material color */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Label className="text-xs">Tint</Label>
            <button
              type="button"
              onClick={() => update({ tintColor: '#ffffff' })}
              disabled={isDefaultTint}
              className="text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-0 disabled:pointer-events-none transition-opacity"
            >
              <IconRefresh size={10} />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={hexDraft ?? tintColor}
              maxLength={7}
              spellCheck={false}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={(e) => commitHex(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitHex(e.currentTarget.value)
                if (e.key === 'Escape') setHexDraft(null)
                e.stopPropagation()
              }}
              className="w-14 text-xs text-right font-mono text-muted-foreground bg-transparent border-0 outline-none p-0 focus:text-foreground"
            />
            <input
              type="color"
              value={tintColor}
              onChange={(e) => update({ tintColor: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border border-border p-0 bg-transparent"
            />
          </div>
        </div>
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
