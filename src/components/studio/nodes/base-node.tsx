import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import {
  IconBolt,
  IconMaximize,
  IconPhoto,
  IconPlayerPlay,
  IconPlayerTrackNext,
  IconPower,
} from '@tabler/icons-react'
import { PreviewModal } from '../preview-modal'
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
  isRunning?: boolean
  waitingLabel?: string
  onRun?: () => void
  onRunNodes?: () => void
  hasValidInput?: boolean
  disabled?: boolean
  onToggleDisabled?: () => void
  liveMode?: boolean
  onToggleLive?: () => void
  nodeId: string
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
  disabled,
  onToggleDisabled,
  liveMode,
  onToggleLive,
  nodeId,
}: BaseNodeProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const showWaiting = isRunning && (!nodeStatus || nodeStatus === 'idle')
  const showRunning = nodeStatus === 'running'
  const showError = nodeStatus === 'error'

  return (
    <>
      {
        <PreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title={label}
          dataUrl={resultPreview ?? null}
          nodeId={nodeId}
        />
      }
      <Card
        className={cn(
          'w-[280px] rounded-none shadow-md py-0 gap-1',
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
          {(onRun || onRunNodes || onToggleDisabled || onToggleLive) && (
            <div className="flex gap-1.5 ml-auto pl-4">
              {onToggleLive && (
                <Button
                  size="icon-xs"
                  variant={liveMode ? 'default' : 'ghost'}
                  onClick={onToggleLive}
                  title={liveMode ? 'Live preview: on' : 'Live preview: off'}
                >
                  <IconBolt size={14} />
                </Button>
              )}
              {onToggleDisabled && (
                <Button
                  size="icon-xs"
                  variant={disabled ? 'secondary' : 'ghost'}
                  onClick={onToggleDisabled}
                  title={disabled ? 'Enable node' : 'Disable node'}
                >
                  <IconPower size={14} />
                </Button>
              )}
              {onRun && (
                <Button
                  size="icon-xs"
                  variant="outline"
                  disabled={!hasValidInput || isRunning || disabled}
                  onClick={onRun}
                >
                  <IconPlayerPlay size={14} />
                </Button>
              )}
              {onRunNodes && (
                <Button
                  size="icon-xs"
                  variant="outline"
                  disabled={!hasValidInput || isRunning || disabled}
                  onClick={onRunNodes}
                >
                  <IconPlayerTrackNext size={14} />
                </Button>
              )}
            </div>
          )}
        </CardHeader>

        {/* Preview — always visible, 1:1 square */}
        <div className={cn('px-3 pb-2 pt-0', disabled && 'opacity-50')}>
          <div className="group relative aspect-square w-full overflow-hidden border bg-muted">
            {disabled ? (
              <PreviewOverlay
                icon={
                  <IconPower size={20} className="text-muted-foreground/50" />
                }
                label="Disabled"
              />
            ) : showRunning ? (
              <PreviewOverlay icon={<Spinner />} label="Processing…" />
            ) : showError ? (
              <PreviewOverlay
                label={nodeError ?? 'Unknown error'}
                labelClassName="text-destructive/80"
                title={nodeError ?? ''}
              />
            ) : showWaiting ? (
              <PreviewOverlay label={waitingLabel} />
            ) : resultPreview ? (
              <img
                src={resultPreview}
                alt="Output preview"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <IconPhoto size={24} className="text-muted-foreground/40" />
              </div>
            )}
            {/* Fullscreen button — only when there's an image to show */}
            {resultPreview && !disabled && (
              <Button
                size="icon-sm"
                variant="ghost"
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/70 hover:bg-background/90"
                onClick={(e) => {
                  e.stopPropagation()
                  setPreviewOpen(true)
                }}
              >
                <IconMaximize size={14} />
                <span className="sr-only">View fullscreen</span>
              </Button>
            )}
          </div>
        </div>

        {/* Settings */}
        {children && (
          <CardContent className="px-3 pb-3 pt-0">
            <fieldset
              disabled={disabled}
              className={cn(
                'border-0 p-0 m-0 min-w-0',
                disabled && 'opacity-50 pointer-events-none',
              )}
            >
              {children}
            </fieldset>
          </CardContent>
        )}

        {hasOutput && (
          <Handle
            type="source"
            position={Position.Right}
            className="w-2.5! h-2.5! rounded-full! border-2! border-primary! bg-background!"
          />
        )}
      </Card>
    </>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 shrink-0 text-muted-foreground"
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
  )
}

function PreviewOverlay({
  icon,
  label,
  detail,
  title,
  labelClassName = 'text-muted-foreground/60',
}: {
  icon?: React.ReactNode
  label: string
  detail?: string
  title?: string
  labelClassName?: string
}) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2"
      title={title}
    >
      {icon}
      <span className={cn('text-xs text-center', labelClassName)}>{label}</span>
      {detail && (
        <span className="text-xs text-destructive/70 text-center line-clamp-3 leading-tight">
          {detail}
        </span>
      )}
    </div>
  )
}
