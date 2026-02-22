import { IconVectorTriangle } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import { SliderRow } from './slider-row'
import type { NodeProps } from '@xyflow/react'
import type { NormalmapNodeData, StudioNode } from '@/types/studio'
import { Label } from '@/components/ui/label'
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
} from '@/lib/workflow-store'
import { useNodeConnection } from '@/hooks/use-node-connection'
import { useNodeUpdater } from '@/hooks/use-node-updater'

export function NormalmapNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'normalmap') return null

  const isRunning = useActiveWorkflowIsRunning()
  const { runNode, runNodesFrom } = useActiveWorkflowActions()
  const { result, hasValidInput } = useNodeConnection(id)
  const { update, toggleDisabled, toggleLive } =
    useNodeUpdater<NormalmapNodeData>(id, {
      live: data.live,
      hasValidInput,
      isRunning,
    })

  // Derive toggle group value from the three invert booleans
  const invertValues: Array<string> = [
    data.invertR && 'R',
    data.invertG && 'G',
    data.invertHeight && 'Height',
  ].filter((v): v is string => v !== false)

  function handleInvertChange(values: Array<string>) {
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
              <SelectItem value="sobel" className="text-xs">
                Sobel
              </SelectItem>
              <SelectItem value="scharr" className="text-xs">
                Scharr
              </SelectItem>
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
                <ToggleGroupItem
                  key={v}
                  value={v}
                  className="flex-1 text-xs h-7"
                >
                  {v}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox
              checked={data.zRange}
              onCheckedChange={(checked) =>
                update({ zRange: checked === true })
              }
            />
            Z Range −1 to +1
          </label>
        </div>
      </div>
    </BaseNode>
  )
}
