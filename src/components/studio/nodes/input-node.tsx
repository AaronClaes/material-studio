import { useReactFlow } from '@xyflow/react'
import { IconPhoto } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioEdge, StudioNode } from '@/types/studio'
import { Label } from '@/components/ui/label'
import { useExecutionStore } from '@/lib/execution-store'

export function InputNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'inputNode') return null

  const { setNodes, getEdges, getNodes } = useReactFlow()
  const run = useExecutionStore((s) => s.run)
  const runNode = useExecutionStore((s) => s.runNode)
  const isRunning = useExecutionStore((s) => s.isRunning)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      const updatedNodes = (getNodes() as Array<StudioNode>).map((n) =>
        n.id === id ? { ...n, data: { ...n.data, src } } : n,
      )
      setNodes(updatedNodes)
      run(updatedNodes, getEdges() as Array<StudioEdge>)
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
      isRunning={isRunning}
      hasValidInput={!!data.src}
      onRun={() =>
        runNode(
          id,
          getNodes() as Array<StudioNode>,
          getEdges() as Array<StudioEdge>,
        )
      }
      onRunNodes={() =>
        run(getNodes() as Array<StudioNode>, getEdges() as Array<StudioEdge>)
      }
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
