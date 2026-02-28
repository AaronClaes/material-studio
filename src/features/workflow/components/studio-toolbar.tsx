import {
  IconClipboardList,
  IconCopy,
  IconDotsVertical,
  IconFileExport,
  IconPlayerPlay,
  IconTrash,
} from '@tabler/icons-react'
import { useWorkflowNameEditor } from '../hooks/use-workflow-name-editor'
import { ConfirmRemoveWorkflow } from './confirm-remove-workflow'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface StudioToolbarProps {
  workflowId: string
  workflowName: string
  onRenameWorkflow: (workflowId: string, name: string) => void
  onRunWorkflow: () => void
  isRunning: boolean
  canRun: boolean
  onExportWorkflow: () => void
  onDuplicateWorkflow: () => void
  canDeleteWorkflow: boolean
  hasHistory: boolean
  onViewHistory: () => void
}

export function StudioToolbar({
  workflowId,
  workflowName,
  onRenameWorkflow,
  onRunWorkflow,
  isRunning,
  canRun,
  onExportWorkflow,
  onDuplicateWorkflow,
  canDeleteWorkflow,
  hasHistory,
  onViewHistory,
}: StudioToolbarProps) {
  const {
    editingId,
    editValue,
    setEditValue,
    inputRef,
    startEdit,
    commitEdit,
    handleKeyDown,
  } = useWorkflowNameEditor({ onCommitName: onRenameWorkflow })
  const isEditing = editingId === workflowId

  return (
    <div className="flex items-center justify-between border-b bg-card">
      <div />
      <div>
        {workflowName &&
          (isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="min-w-48 text-center text-sm bg-transparent outline-none border-b border-primary"
              aria-label="Workflow name"
            />
          ) : (
            <button
              type="button"
              className="font-normal text-muted-foreground hover:text-foreground transition-colors"
              onDoubleClick={() => startEdit(workflowId, workflowName)}
              title="Double-click to rename"
            >
              {workflowName}
            </button>
          ))}
      </div>
      <div className="h-full flex items-center gap-1 pr-2 py-2">
        {hasHistory && (
          <Button
            size="sm"
            variant="outline"
            onClick={onViewHistory}
            className="gap-1.5"
          >
            <IconClipboardList size={14} />
            View History
          </Button>
        )}
        <Button
          size="sm"
          onClick={onRunWorkflow}
          disabled={isRunning || !canRun}
          className="gap-1.5"
        >
          <IconPlayerPlay size={14} />
          {isRunning ? 'Running…' : 'Run Workflow'}
        </Button>
        <ConfirmRemoveWorkflow workflowId={workflowId}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="outline" className="px-2">
                <IconDotsVertical size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto">
              <DropdownMenuItem
                onClick={onDuplicateWorkflow}
                className="text-nowrap"
              >
                <IconCopy size={14} />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onExportWorkflow}
                className="text-nowrap"
              >
                <IconFileExport size={14} />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ConfirmRemoveWorkflow.Trigger>
                <DropdownMenuItem
                  disabled={!canDeleteWorkflow}
                  variant="destructive"
                >
                  <IconTrash size={14} />
                  Remove
                </DropdownMenuItem>
              </ConfirmRemoveWorkflow.Trigger>
            </DropdownMenuContent>
          </DropdownMenu>
        </ConfirmRemoveWorkflow>
      </div>
    </div>
  )
}
