import { useReactFlow } from '@xyflow/react'
import { IconMaximize } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { NodeResult, StudioNode } from '@/types/studio'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useExecutionStore } from '@/lib/execution-store'

export function ResolutionNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'resolution') return null

  const { setNodes } = useReactFlow()
  const result = useExecutionStore((s) => s.results[id] as NodeResult | undefined)
  const isRunning = useExecutionStore((s) => s.isRunning)

  function update(patch: Partial<typeof data>) {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    )
  }

  return (
    <BaseNode
      label={data.label}
      icon={<IconMaximize size={14} />}
      selected={selected}
      nodeStatus={result?.status}
      resultPreview={result?.outputDataUrl}
      nodeError={result?.error}
      isRunning={isRunning}
    >
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Width</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={data.width}
              onChange={(e) => update({ width: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Height</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={data.height}
              onChange={(e) => update({ height: Number(e.target.value) })}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            checked={data.maintainAspect}
            onChange={(e) => update({ maintainAspect: e.target.checked })}
          />
          Maintain aspect ratio
        </label>
      </div>
    </BaseNode>
  )
}
