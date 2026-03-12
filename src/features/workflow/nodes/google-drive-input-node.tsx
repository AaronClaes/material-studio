import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  IconBrandGoogleDrive,
  IconFolderOpen,
  IconSettings,
} from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioNode } from '@/features/workflow/types'
import {
  loadWorkflowInput,
  saveWorkflowInput,
  deleteWorkflowInput,
} from '@/shared/lib/image-opfs'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  useActiveWorkflowActions,
  useActiveWorkflowIsRunning,
  useActiveWorkflowResults,
  useWorkflowStore,
} from '@/features/workflow/store/workflow-store'
import { cn } from '@/shared/lib/utils'
import {
  useGoogleAuth,
  useGooglePicker,
  downloadFileAsDataUrl,
  listFolderImages,
} from '@/features/google-drive'

export function GoogleDriveInputNode({
  id,
  data,
  selected,
}: NodeProps<StudioNode>) {
  if (data.kind !== 'googleDriveInputNode') return null

  const queryClient = useQueryClient()
  const { runNodesFrom } = useActiveWorkflowActions()
  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId)
  const patchNodeData = useWorkflowStore((s) => s.patchNodeData)
  const results = useActiveWorkflowResults()
  const isRunning = useActiveWorkflowIsRunning()

  const { isSignedIn, accessToken } = useGoogleAuth()
  const { openFilePicker, openFolderPicker } = useGooglePicker()

  const isBatch = !!data.batch
  const result = results[id]

  // Restore single file input from OPFS on mount
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
        fileId: undefined,
        fileName: undefined,
      })
      deleteWorkflowInput(activeWorkflowId, id)
    } else {
      patchNodeData(activeWorkflowId, id, {
        batch: false,
        src: '',
        srcFilename: undefined,
        folderId: undefined,
        folderName: undefined,
        fileCount: undefined,
        processedCount: undefined,
      })
    }
  }

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

  if (!isSignedIn) {
    return (
      <BaseNode
        label={data.label}
        icon={<IconBrandGoogleDrive size={14} />}
        selected={selected}
        hasInput={false}
        resultPreview={null}
        nodeStatus="idle"
        nodeError={null}
        isRunning={false}
        hasValidInput={false}
        nodeId={id}
      >
        <div className="flex flex-col items-center gap-2 py-2">
          <p className="text-xs text-muted-foreground text-center">
            Connect Google Drive in Settings to use this node.
          </p>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to="/settings">
              <IconSettings size={14} />
              Settings
            </Link>
          </Button>
        </div>
      </BaseNode>
    )
  }

  if (isBatch) {
    async function pickFolder() {
      const result = await openFolderPicker()
      if (!result || !accessToken) return

      patchNodeData(activeWorkflowId, id, {
        folderId: result.folderId,
        folderName: result.folderName,
        processedCount: 0,
      })

      // List folder contents for count and first-image preview
      const files = await listFolderImages(accessToken, result.folderId)
      let previewSrc = ''
      let srcFilename = ''
      const firstFile = files[0]
      if (firstFile) {
        previewSrc = await downloadFileAsDataUrl(accessToken, firstFile.id)
        srcFilename = firstFile.name.replace(/\.[^.]+$/, '')
      }
      patchNodeData(activeWorkflowId, id, {
        fileCount: files.length,
        src: previewSrc,
        srcFilename,
      })
    }

    async function handleRun() {
      await useWorkflowStore
        .getState()
        .runGDriveBatch(activeWorkflowId, id)
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
        hasValidInput={!!data.folderId}
        onRunNodes={handleRun}
        nodeId={id}
      >
        {modeToggle}
        <div className="flex flex-col gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Google Drive Folder</Label>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 w-full justify-start"
              onClick={pickFolder}
              disabled={isRunning}
            >
              <IconFolderOpen size={14} />
              {data.folderName ?? 'Choose folder…'}
            </Button>
          </div>
          {data.folderId && (
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
  async function pickFile() {
    const result = await openFilePicker()
    if (!result || !accessToken) return

    patchNodeData(activeWorkflowId, id, {
      fileId: result.fileId,
      fileName: result.fileName,
      srcFilename: result.fileName.replace(/\.[^.]+$/, ''),
    })

    const src = await downloadFileAsDataUrl(accessToken, result.fileId)
    patchNodeData(activeWorkflowId, id, { src })

    // Persist to OPFS for offline restore
    const blob = await fetch(src).then((r) => r.blob())
    await saveWorkflowInput(activeWorkflowId, id, blob)
    queryClient.invalidateQueries({
      queryKey: ['workflow-input', activeWorkflowId, id],
    })
  }

  return (
    <BaseNode
      label={data.label}
      icon={<IconBrandGoogleDrive size={14} />}
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
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 w-full justify-start"
          onClick={pickFile}
          disabled={isRunning}
        >
          <IconBrandGoogleDrive size={14} />
          {data.fileName ?? 'Pick from Drive…'}
        </Button>
      </div>
    </BaseNode>
  )
}
