import { IconPhoto } from '@tabler/icons-react'
import { RepeatTileGrid } from './repeat-tile-grid'

export interface SplitViewProps {
  leftDataUrl: string | null
  rightDataUrl: string | null
  leftLabel: string
  rightLabel: string
  repeatEnabled?: boolean
  repeatAmount?: number
  showGrid?: boolean
}

export function SplitView({
  leftDataUrl,
  rightDataUrl,
  leftLabel,
  rightLabel,
  repeatEnabled = false,
  repeatAmount = 3,
  showGrid = false,
}: SplitViewProps) {
  function renderPanel(dataUrl: string | null, alt: string) {
    if (!dataUrl) {
      return (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <IconPhoto size={32} className="opacity-30" />
          <span className="text-xs">No output</span>
        </div>
      )
    }
    if (repeatEnabled) {
      return (
        <RepeatTileGrid
          dataUrl={dataUrl}
          repeatAmount={repeatAmount}
          showGrid={showGrid}
          className="w-full h-full"
        />
      )
    }
    return (
      <img
        src={dataUrl}
        alt={alt}
        className="max-h-full max-w-full object-contain"
      />
    )
  }

  return (
    <div className="flex h-full w-full">
      <div className="relative flex flex-1 items-center justify-center p-4 border-r border-border overflow-hidden">
        {renderPanel(leftDataUrl, leftLabel)}
        <span className="absolute bottom-2 left-2 border border-border/50 bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground backdrop-blur-sm">
          {leftLabel}
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-center p-4 overflow-hidden">
        {renderPanel(rightDataUrl, rightLabel)}
        <span className="absolute bottom-2 right-2 border border-border/50 bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground backdrop-blur-sm">
          {rightLabel} (current)
        </span>
      </div>
    </div>
  )
}
