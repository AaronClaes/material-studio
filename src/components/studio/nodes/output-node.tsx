import { useReactFlow } from '@xyflow/react'
import { IconDownload, IconFolder, IconFolderOpen } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioNode } from '@/types/studio'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { useDirectoryStore } from '@/lib/directory-store'
import {
  supportsDirectoryPicker,
  useDirectoryPicker,
} from '@/hooks/use-directory-picker'
import { useNodeConnection } from '@/hooks/use-node-connection'

export function OutputNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'outputNode') return null

  const { setNodes, updateNodeData } = useReactFlow()
  const isRunning = useActiveWorkflowIsRunning()
  const { runNode } = useActiveWorkflowActions()
  const handle = useDirectoryStore((s) => s.handles[id])
  const setHandle = useDirectoryStore((s) => s.setHandle)
  const { pickDirectory } = useDirectoryPicker('readwrite')
  const { result, hasValidInput } = useNodeConnection(id)

  function toggleDisabled() {
    updateNodeData(id, { disabled: !data.disabled })
  }

  async function pickFolder() {
    const dir = await pickDirectory()
    if (dir) setHandle(id, dir)
  }

  function setFormat(format: 'png' | 'jpg' | 'webp') {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, format } } : n,
      ),
    )
  }

  function setFilename(filename: string) {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, filename } } : n,
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
      hasValidInput={hasValidInput}
      disabled={data.disabled}
      onToggleDisabled={toggleDisabled}
      onRun={() => runNode(id)}
      nodeId={id}
    >
      <div className="flex flex-col gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Output Location</Label>
          {supportsDirectoryPicker ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 justify-start gap-1.5 text-xs font-normal truncate"
              onClick={pickFolder}
            >
              {handle ? (
                <>
                  <IconFolderOpen size={13} className="shrink-0" />
                  <span className="truncate">{handle.name}</span>
                </>
              ) : (
                <>
                  <IconFolder
                    size={13}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="text-muted-foreground">Choose folder…</span>
                </>
              )}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Not supported in this browser
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Filename</Label>
          <Input
            value={data.filename}
            onChange={(e) => setFilename(e.target.value)}
            className="h-7 text-xs"
            placeholder="output"
          />
          <p className="text-[10px] text-muted-foreground">
            Use <code className="font-mono">{'{name}'}</code> for source
            filename
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Format</Label>
          <Select value={data.format} onValueChange={setFormat}>
            <SelectTrigger className="h-7 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="jpg">JPG</SelectItem>
              <SelectItem value="webp">WebP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </BaseNode>
  )
}
