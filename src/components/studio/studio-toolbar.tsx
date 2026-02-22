import {
  IconCopy,
  IconDotsVertical,
  IconFileExport,
  IconPlayerPlay,
  IconTrash,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWorkflowNameEditor } from './use-workflow-name-editor'

interface StudioToolbarProps {
  workflowId: string
  workflowName: string
  onRenameWorkflow: (workflowId: string, name: string) => void
  onRunWorkflow: () => void
  isRunning: boolean
  canRun: boolean
  onExportWorkflow: () => void
  onDuplicateWorkflow: () => void
  onDeleteWorkflow: () => void
  canDeleteWorkflow: boolean
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
  onDeleteWorkflow,
  canDeleteWorkflow,
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
      <div className="w-52 border-r border-border pl-4 py-2 h-full flex items-center">
        <img
          src="/material-studio-logo.png"
          alt="Material Studio"
          className="w-6 h-6 mr-2"
        />
        <h1 className="text-sm font-semibold tracking-tight">
          Material Studio
        </h1>
      </div>
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
        <Button
          size="sm"
          onClick={onRunWorkflow}
          disabled={isRunning || !canRun}
          className="gap-1.5"
        >
          <IconPlayerPlay size={14} />
          {isRunning ? 'Running…' : 'Run Workflow'}
        </Button>
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
            <DropdownMenuItem
              onClick={onDeleteWorkflow}
              disabled={!canDeleteWorkflow}
              variant="destructive"
            >
              <IconTrash size={14} />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
