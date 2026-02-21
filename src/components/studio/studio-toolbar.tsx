import { IconPlayerPlay } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

interface StudioToolbarProps {
  workflowName: string
  onRunWorkflow: () => void
  isRunning: boolean
}

export function StudioToolbar({
  workflowName,
  onRunWorkflow,
  isRunning,
}: StudioToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-2 bg-card">
      <span className="text-sm font-semibold tracking-tight">
        Material Studio
        {workflowName && (
          <>
            <span className="mx-2 text-muted-foreground font-normal">·</span>
            <span className="font-normal text-muted-foreground">{workflowName}</span>
          </>
        )}
      </span>
      <Button
        size="sm"
        onClick={onRunWorkflow}
        disabled={isRunning}
        className="gap-1.5"
      >
        <IconPlayerPlay size={14} />
        {isRunning ? 'Running…' : 'Run Workflow'}
      </Button>
    </div>
  )
}
