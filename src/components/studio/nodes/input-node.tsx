import { useReactFlow } from '@xyflow/react'
import { IconPhoto } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioNode } from '@/types/studio'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function InputNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'inputNode') return null

  const { setNodes } = useReactFlow()

  function setSrc(src: string) {
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, src } } : n)),
    )
  }

  return (
    <BaseNode
      label={data.label}
      icon={<IconPhoto size={14} />}
      selected={selected}
      hasInput={false}
    >
      <div className="space-y-1.5">
        <Label className="text-xs">Image URL</Label>
        <Input
          className="h-7 text-xs"
          placeholder="https://..."
          value={data.src}
          onChange={(e) => setSrc(e.target.value)}
        />
      </div>
    </BaseNode>
  )
}
