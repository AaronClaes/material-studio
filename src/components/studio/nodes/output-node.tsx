import { useReactFlow } from '@xyflow/react'
import { IconDownload } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioNode } from '@/types/studio'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useExecutionStore } from '@/lib/execution-store'

export function OutputNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'outputNode') return null

  const { setNodes } = useReactFlow()
  const result = useExecutionStore((s) => s.results[id])
  const isRunning = useExecutionStore((s) => s.isRunning)

  function setFormat(format: 'png' | 'jpg' | 'webp') {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, format } } : n,
      ),
    )
  }

  return (
    <BaseNode
      label={data.label}
      icon={<IconDownload size={14} />}
      selected={selected}
      hasOutput={false}
      nodeStatus={result?.status}
      resultPreview={result?.outputDataUrl}
      nodeError={result?.error}
      isRunning={isRunning}
      waitingLabel="Processing workflow…"
    >
      <div className="space-y-1.5">
        <Label className="text-xs">Format</Label>
        <Select value={data.format} onValueChange={setFormat}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="jpg">JPG</SelectItem>
            <SelectItem value="webp">WebP</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </BaseNode>
  )
}
