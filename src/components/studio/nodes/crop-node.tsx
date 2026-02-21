import { useReactFlow } from '@xyflow/react'
import { IconCrop } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { NodeResult, StudioNode } from '@/types/studio'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useExecutionStore } from '@/lib/execution-store'

export function CropNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'crop') return null

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
      icon={<IconCrop size={14} />}
      selected={selected}
      nodeStatus={result?.status}
      resultPreview={result?.outputDataUrl}
      nodeError={result?.error}
      isRunning={isRunning}
    >
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        {(
          [
            ['x', 'X', data.x],
            ['y', 'Y', data.y],
            ['width', 'W', data.width],
            ['height', 'H', data.height],
          ] as const
        ).map(([key, lbl, val]) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{lbl}</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={val}
              onChange={(e) => update({ [key]: Number(e.target.value) })}
            />
          </div>
        ))}
      </div>
    </BaseNode>
  )
}
