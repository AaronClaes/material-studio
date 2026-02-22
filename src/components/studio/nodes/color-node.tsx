import { useState } from 'react'
import { IconPalette, IconRefresh } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import { SliderRow } from './slider-row'
import type { NodeProps } from '@xyflow/react'
import type { ColorNodeData, StudioNode } from '@/types/studio'
import { Label } from '@/components/ui/label'
import {
  useActiveWorkflowActions,
  useActiveWorkflowIsRunning,
} from '@/lib/workflow-store'
import { useNodeConnection } from '@/hooks/use-node-connection'
import { useNodeUpdater } from '@/hooks/use-node-updater'

export function ColorNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'color') return null

  const isRunning = useActiveWorkflowIsRunning()
  const { runNode, runNodesFrom } = useActiveWorkflowActions()
  const { result, hasValidInput } = useNodeConnection(id)
  const { update, toggleDisabled, toggleLive } = useNodeUpdater<ColorNodeData>(
    id,
    { live: data.live, hasValidInput, isRunning },
  )
  const [hexDraft, setHexDraft] = useState<string | null>(null)

  const tintColor = data.tintColor
  const isDefaultTint = tintColor.toLowerCase() === '#ffffff'

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
      onToggleDisabled={() => toggleDisabled(data.disabled ?? false)}
      onRun={() => runNode(id)}
      onRunNodes={() => runNodesFrom(id)}
      liveMode={data.live}
      onToggleLive={() => toggleLive(data.live ?? false)}
      nodeId={id}
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
