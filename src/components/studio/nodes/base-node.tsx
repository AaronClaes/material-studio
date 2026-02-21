import { Handle, Position } from '@xyflow/react'
import { IconPlayerPlay, IconPlayerTrackNext } from '@tabler/icons-react'
import type { NodeStatus } from '@/types/studio'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BaseNodeProps {
  label: string
  icon: React.ReactNode
  selected?: boolean
  hasInput?: boolean
  hasOutput?: boolean
  children?: React.ReactNode
  nodeStatus?: NodeStatus
  resultPreview?: string | null
  nodeError?: string | null
  /** Whether the workflow is currently running (used to show waiting state) */
  isRunning?: boolean
  /** Message shown while this node is waiting for upstream nodes to finish */
  waitingLabel?: string
  onRun?: () => void
  onRunNodes?: () => void
  hasValidInput?: boolean
}

export function BaseNode({
  label,
  icon,
  selected,
  hasInput = true,
  hasOutput = true,
  children,
  nodeStatus,
  resultPreview,
  nodeError,
  isRunning,
  waitingLabel = 'Waiting for input…',
  onRun,
  onRunNodes,
  hasValidInput,
}: BaseNodeProps) {
  const showWaiting = isRunning && (!nodeStatus || nodeStatus === 'idle')
  const showRunning = nodeStatus === 'running'
  const showResult = nodeStatus === 'done' && !!resultPreview
  const showError = nodeStatus === 'error'
  const hasStatusContent = showWaiting || showRunning || showResult || showError

  return (
    <Card
      className={cn(
        'w-[240px] rounded-none shadow-md py-0 gap-1',
        selected && 'ring-2 ring-primary',
      )}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-2.5! h-2.5! rounded-full border-2 border-primary bg-background!"
        />
      )}
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-2">
        <span className="text-muted-foreground">{icon}</span>
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {/* Per-node run buttons */}
        {(onRun || onRunNodes) && (
          <div className="flex gap-1.5 ml-auto pl-4">
            {onRun && (
              <Button
                size="xs"
                variant="outline"
                disabled={!hasValidInput || isRunning}
                onClick={onRun}
              >
                <IconPlayerPlay size={14} />
              </Button>
            )}
            {onRunNodes && (
              <Button
                size="xs"
                variant="outline"
                disabled={!hasValidInput || isRunning}
                onClick={onRunNodes}
              >
                <IconPlayerTrackNext size={14} />
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      {/* Status / preview — above settings */}
      {hasStatusContent && (
        <div className="px-3 pb-2 pt-0">
          {showRunning && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <svg
                className="animate-spin h-3 w-3 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Processing…
            </div>
          )}
          {showResult && (
            <img
              src={resultPreview}
              alt="Output preview"
              className="w-full h-auto rounded-sm border"
            />
          )}
          {showError && (
            <p
              className="text-xs text-destructive truncate"
              title={nodeError ?? ''}
            >
              {nodeError ?? 'Unknown error'}
            </p>
          )}
          {showWaiting && (
            <p className="text-xs text-muted-foreground">{waitingLabel}</p>
          )}
        </div>
      )}

      {/* Settings */}
      {children && (
        <CardContent className="px-3 pb-3 pt-0">{children}</CardContent>
      )}

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-2.5! h-2.5! rounded-full! border-2! border-primary! bg-background!"
        />
      )}
    </Card>
  )
}
