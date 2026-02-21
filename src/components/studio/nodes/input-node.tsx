import { useReactFlow } from '@xyflow/react'
import { IconPhoto } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioNode } from '@/types/studio'
import { Label } from '@/components/ui/label'

export function InputNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'inputNode') return null

  const { setNodes } = useReactFlow()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, src } } : n,
        ),
      )
    }
    reader.readAsDataURL(file)
  }

  return (
    <BaseNode
      label={data.label}
      icon={<IconPhoto size={14} />}
      selected={selected}
      hasInput={false}
      resultPreview={data.src}
      nodeStatus={data.src ? 'done' : 'idle'}
      nodeError={null}
      // Input node has no upstream — no "waiting" state needed.
      // The uploaded image serves as both input and result preview.
    >
      <div className="space-y-1.5">
        <Label className="text-xs">Image File</Label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="w-full text-xs text-muted-foreground file:mr-2 file:text-xs file:border-0 file:bg-muted file:px-2 file:py-1 file:rounded cursor-pointer"
        />
      </div>
    </BaseNode>
  )
}
