import { IconLoader2, IconPlayerPlay, IconRefresh } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export type RetryStatus = 'idle' | 'configuring' | 'running' | 'reviewing'

interface RetryActionBarProps {
  status: RetryStatus
  progress: { current: number; total: number } | null
  onCancel: () => void
  onRun: () => void
  onDiscard: () => void
  onRetryAgain: () => void
  onKeep: () => void
}

export function RetryActionBar({
  status,
  progress,
  onCancel,
  onRun,
  onDiscard,
  onRetryAgain,
  onKeep,
}: RetryActionBarProps) {
  if (status === 'idle') return null

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background border shadow-lg px-4 py-2">
      {status === 'configuring' && (
        <>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1.5" onClick={onRun}>
            <IconPlayerPlay className="size-3" />
            Run with new settings
          </Button>
        </>
      )}

      {status === 'running' && (
        <>
          {progress && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Processing {progress.current}/{progress.total}...
            </span>
          )}
          <IconLoader2 className="size-3.5 animate-spin text-muted-foreground" />
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
            Cancel
          </Button>
        </>
      )}

      {status === 'reviewing' && (
        <>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onDiscard}>
            Discard
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onRetryAgain}>
            <IconRefresh className="size-3" />
            Retry again
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={onKeep}>
            Keep results
          </Button>
        </>
      )}
    </div>
  )
}
