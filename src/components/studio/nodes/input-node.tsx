import { IconFolder, IconFolderOpen, IconPhoto } from '@tabler/icons-react'
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
import { readDirectoryPreview, useDirectoryStore } from '@/lib/directory-store'
import {
  supportsDirectoryPicker,
  useDirectoryPicker,
} from '@/hooks/use-directory-picker'
import { cn } from '@/lib/utils'

export function InputNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'inputNode') return null

  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId)
  const patchNodeData = useWorkflowStore((s) => s.patchNodeData)
  const results = useActiveWorkflowResults()
  const isRunning = useActiveWorkflowIsRunning()
  const handle = useDirectoryStore((s) => s.handles[id])
  const setHandle = useDirectoryStore((s) => s.setHandle)
  const clearHandle = useDirectoryStore((s) => s.clearHandle)
  const { pickDirectory } = useDirectoryPicker('read')

  const isBatch = !!data.batch
  const result = results[id]

  function switchMode(toBatch: boolean) {
    if (toBatch === isBatch) return
    if (toBatch) {
      patchNodeData(activeWorkflowId, id, {
        batch: true,
        src: '',
        srcFilename: undefined,
      })
    } else {
      clearHandle(id)
      patchNodeData(activeWorkflowId, id, {
        batch: false,
        src: '',
        srcFilename: undefined,
        folderName: undefined,
        fileCount: undefined,
        processedCount: undefined,
      })
    }
  }

  // Shared mode toggle rendered inside both branches
  const modeToggle = (
    <div className="flex rounded-sm overflow-hidden border text-xs mb-3">
      <button
        className={cn(
          'flex-1 py-1 transition-colors',
          !isBatch
            ? 'bg-muted text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground',
        )}
        onClick={() => switchMode(false)}
        disabled={isRunning}
      >
        File
      </button>
      <button
        className={cn(
          'flex-1 py-1 border-l transition-colors',
          isBatch
            ? 'bg-muted text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground',
        )}
        onClick={() => switchMode(true)}
        disabled={isRunning}
      >
        Folder
      </button>
    </div>
  )

  if (isBatch) {
    async function pickFolder() {
      const dir = await pickDirectory()
      if (!dir) return
      setHandle(id, dir)

      const preview = await readDirectoryPreview(dir)
      patchNodeData(activeWorkflowId, id, {
        ...preview,
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
        {modeToggle}
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
                    <span className="text-muted-foreground">
                      Choose folder…
                    </span>
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

  // Single file mode
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const srcFilename = file.name.replace(/\.[^.]+$/, '')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      patchNodeData(activeWorkflowId, id, { src, srcFilename })
      useWorkflowStore.getState().runNodesFrom(activeWorkflowId, id)
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
      onRunNodes={() => useWorkflowStore.getState().run(activeWorkflowId)}
      nodeId={id}
    >
      {modeToggle}
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
