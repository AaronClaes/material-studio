import { IconSparkles } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { NanoBananaNodeData, StudioNode } from '@/features/workflow/types'
import { Label } from '@/components/ui/label'
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
} from '@/features/workflow/store/workflow-store'
import { useNodeConnection } from '@/features/workflow/hooks/use-node-connection'
import { useNodeUpdater } from '@/features/workflow/hooks/use-node-updater'

const MODELS = [
  { value: 'gemini-2.5-flash-image', label: 'Nano Banana' },
  { value: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2' },
  { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro' },
] as const

const ASPECT_RATIOS = [
  '1:1',
  '1:4',
  '1:8',
  '2:3',
  '3:2',
  '3:4',
  '4:1',
  '4:3',
  '4:5',
  '5:4',
  '8:1',
  '9:16',
  '16:9',
  '21:9',
]

const IMAGE_SIZES_BY_MODEL: Record<string, Array<string>> = {
  'gemini-2.5-flash-image': ['1K', '2K', '4K'],
  'gemini-3.1-flash-image-preview': ['512', '1K', '2K', '4K'],
  'gemini-3-pro-image-preview': ['1K', '2K', '4K'],
}

export function NanoBananaNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'nanoBanana') return null

  const isRunning = useActiveWorkflowIsRunning()
  const { runNode, runNodesFrom } = useActiveWorkflowActions()
  const { result, hasValidInput } = useNodeConnection(id)
  const { update, toggleDisabled } = useNodeUpdater<NanoBananaNodeData>(id, {
    live: false,
    hasValidInput,
    isRunning,
  })

  const availableSizes = IMAGE_SIZES_BY_MODEL[data.model] ?? ['1K', '2K', '4K']

  function handleModelChange(model: string) {
    const sizes = IMAGE_SIZES_BY_MODEL[model] ?? ['1K', '2K', '4K']
    const updates: Partial<NanoBananaNodeData> = { model: model as NanoBananaNodeData['model'] }
    if (!sizes.includes(data.imageSize as string)) {
      updates.imageSize = '1K'
    }
    update(updates)
  }

  return (
    <BaseNode
      label={data.label}
      icon={<IconSparkles size={14} />}
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
        {/* Model */}
        <div className="space-y-1">
          <Label className="text-xs">Model</Label>
          <Select value={data.model} onValueChange={handleModelChange}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prompt */}
        <div className="space-y-1">
          <Label className="text-xs">Prompt</Label>
          <textarea
            value={data.prompt}
            onChange={(e) => update({ prompt: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Describe the changes to make..."
            rows={3}
            className="nodrag w-full resize-y text-xs bg-transparent border border-border px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-1">
          <Label className="text-xs">Aspect Ratio</Label>
          <Select
            value={data.aspectRatio}
            onValueChange={(v) => update({ aspectRatio: v })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_RATIOS.map((ratio) => (
                <SelectItem key={ratio} value={ratio} className="text-xs">
                  {ratio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Image Size */}
        <div className="space-y-1">
          <Label className="text-xs">Output Resolution</Label>
          <Select
            value={data.imageSize}
            onValueChange={(v) => update({ imageSize: v })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableSizes.map((size) => (
                <SelectItem key={size} value={size} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </BaseNode>
  )
}
