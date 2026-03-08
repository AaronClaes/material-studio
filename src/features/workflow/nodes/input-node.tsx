import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IconFolderOpen, IconPhoto } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioNode } from '@/features/workflow/types'
import {
  deleteWorkflowInput,
  loadWorkflowInput,
  saveWorkflowInput,
} from '@/shared/lib/image-opfs'
import { Label } from '@/components/ui/label'
import {
  useActiveWorkflowActions,
  useActiveWorkflowIsRunning,
  useActiveWorkflowResults,
  useWorkflowStore,
} from '@/features/workflow/store/workflow-store'
import {
  readDirectoryPreview,
  useDirectoryStore,
} from '@/shared/stores/directory-store'
import { useDirectoryPicker } from '@/shared/hooks/use-directory-picker'
import { DirectoryPickerButton } from '@/shared/components/directory-picker-button'
import { cn } from '@/shared/lib/utils'

export function InputNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'inputNode') return null

  const queryClient = useQueryClient()
  const { runNodesFrom } = useActiveWorkflowActions()
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

  // Regenerate preview when handle is restored but src was cleared on persist
  useEffect(() => {
    if (!handle || data.src) return
    readDirectoryPreview(handle).then((preview) => {
      patchNodeData(activeWorkflowId, id, { ...preview, processedCount: 0 })
    })
  }, [handle])

  // Restore single file input from OPFS on mount (must be before early returns)
  const { data: savedUrl } = useQuery({
    queryKey: ['workflow-input', activeWorkflowId, id],
    queryFn: () => loadWorkflowInput(activeWorkflowId, id),
    enabled: !!activeWorkflowId && !isBatch && !data.src,
  })
  useEffect(() => {
    if (savedUrl) patchNodeData(activeWorkflowId, id, { src: savedUrl })
  }, [savedUrl])

  function switchMode(toBatch: boolean) {
    if (toBatch === isBatch) return
    if (toBatch) {
      patchNodeData(activeWorkflowId, id, {
        batch: true,
        src: '',
        srcFilename: undefined,
      })
      deleteWorkflowInput(activeWorkflowId, id)
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
    <div className="flex overflow-hidden border text-xs mb-3">
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
            <DirectoryPickerButton
              handle={handle}
              onPick={pickFolder}
              disabled={isRunning}
            />
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
    reader.onload = async (ev) => {
      const src = ev.target?.result as string
      patchNodeData(activeWorkflowId, id, { src, srcFilename })
      const blob = await fetch(src).then((r) => r.blob())
      await saveWorkflowInput(activeWorkflowId, id, blob)
      queryClient.invalidateQueries({
        queryKey: ['workflow-input', activeWorkflowId, id],
      })
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
      onRunNodes={() => runNodesFrom(id)}
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
