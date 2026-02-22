import { IconFolder, IconFolderOpen } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioNode } from '@/types/studio'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  useActiveWorkflowIsRunning,
  useActiveWorkflowResults,
  useWorkflowStore,
} from '@/lib/workflow-store'
import { useDirectoryStore } from '@/lib/directory-store'
import {
  supportsDirectoryPicker,
  useDirectoryPicker,
} from '@/hooks/use-directory-picker'

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'bmp',
  'tiff',
  'avif',
])

export function BatchInputNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'batchInputNode') return null

  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId)
  const results = useActiveWorkflowResults()
  const isRunning = useActiveWorkflowIsRunning()
  const handle = useDirectoryStore((s) => s.handles[id])
  const setHandle = useDirectoryStore((s) => s.setHandle)
  const { pickDirectory } = useDirectoryPicker('read')

  const result = results[id]

  async function pickFolder() {
    const dir = await pickDirectory()
    if (!dir) return
    setHandle(id, dir)

    let count = 0
    // @ts-expect-error - values() is not supported in the type
    for await (const entry of dir.values()) {
      if (entry.kind !== 'file') continue
      const ext = entry.name.split('.').pop()?.toLowerCase() ?? ''
      if (IMAGE_EXTENSIONS.has(ext)) count++
    }

    useWorkflowStore.getState().patchNodeData(activeWorkflowId, id, {
      folderName: dir.name,
      fileCount: count,
      processedCount: 0,
    })
  }

  async function handleRun() {
    await useWorkflowStore.getState().runBatch(activeWorkflowId, id)
  }

  return (
    <BaseNode
      label={data.label}
      icon={<IconFolderOpen size={14} />}
      selected={selected}
      hasInput={false}
      resultPreview={result?.outputDataUrl ?? (data.src || null)}
      nodeStatus={result?.status}
      nodeError={result?.error ?? null}
      isRunning={isRunning}
      waitingLabel="Processing batch…"
      hasValidInput={!!handle}
      onRunNodes={handleRun}
      nodeId={id}
    >
      <div className="flex flex-col gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Input Folder</Label>
          {supportsDirectoryPicker ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 justify-start gap-1.5 text-xs font-normal truncate"
              onClick={pickFolder}
              disabled={isRunning}
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
        {handle && (
          <p className="text-xs text-muted-foreground">
            {isRunning
              ? `${data.processedCount} / ${data.fileCount}`
              : `${data.fileCount} file${data.fileCount !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>
    </BaseNode>
  )
}
