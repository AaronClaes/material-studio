import { useReactFlow } from '@xyflow/react'
import { IconBrandGoogleDrive, IconFolder } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioNode } from '@/features/workflow/types'
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
} from '@/features/workflow/store/workflow-store'
import { useNodeConnection } from '@/features/workflow/hooks/use-node-connection'
import { useGoogleAuth } from '@/features/google-drive/hooks/use-google-auth'
import { useGooglePicker } from '@/features/google-drive/hooks/use-google-picker'
import { GoogleAuthButton } from '@/features/google-drive'

export function GoogleDriveOutputNode({ id, data, selected }: NodeProps<StudioNode>) {
  const { updateNodeData } = useReactFlow()
  const isRunning = useActiveWorkflowIsRunning()
  const { runNode } = useActiveWorkflowActions()
  const { isSignedIn } = useGoogleAuth()
  const { openFolderPicker } = useGooglePicker()
  const { result, hasValidInput } = useNodeConnection(id)

  if (data.kind !== 'googleDriveOutputNode') return null

  function toggleDisabled() {
    updateNodeData(id, { disabled: !data.disabled })
  }

  async function pickFolder() {
    const picked = await openFolderPicker()
    if (picked) {
      updateNodeData(id, {
        folderId: picked.folderId,
        folderName: picked.folderName,
      })
    }
  }

  function setFormat(format: 'png' | 'jpg' | 'webp') {
    updateNodeData(id, { format })
  }

  function setFilename(filename: string) {
    updateNodeData(id, { filename })
  }

  return (
    <BaseNode
      label={data.label}
      icon={<IconBrandGoogleDrive size={14} />}
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
        {!isSignedIn ? (
          <GoogleAuthButton />
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Output Folder</Label>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 h-7 text-xs font-normal truncate"
                onClick={pickFolder}
                disabled={isRunning}
              >
                <IconFolder size={13} className="shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {data.folderName ?? 'Choose folder…'}
                </span>
              </Button>
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
          </>
        )}
      </div>
    </BaseNode>
  )
}
