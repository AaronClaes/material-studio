import { IconPhoto } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioNode } from '@/types/studio'
import { Label } from '@/components/ui/label'
import {
  useActiveWorkflowActions,
  useActiveWorkflowIsRunning,
  useWorkflowStore,
} from '@/lib/workflow-store'

export function InputNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'inputNode') return null

  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId)
  const patchNodeData = useWorkflowStore((s) => s.patchNodeData)
  const { run } = useActiveWorkflowActions()
  const isRunning = useActiveWorkflowIsRunning()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      // Update store directly (synchronous) so run() sees the new src immediately
      patchNodeData(activeWorkflowId, id, { src })
      useWorkflowStore.getState().run(activeWorkflowId)
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
      onRunNodes={run}
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
