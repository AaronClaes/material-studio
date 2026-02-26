import { Preview3DView } from './preview-3d-view'
import type { Preview3DShape } from './types'

export interface Split3DViewProps {
  leftDataUrl: string | null
  rightDataUrl: string | null
  leftLabel: string
  rightLabel: string
  shape: Preview3DShape
  textureRepeat: number
}

export function Split3DView({
  leftDataUrl,
  rightDataUrl,
  leftLabel,
  rightLabel,
  shape,
  textureRepeat,
}: Split3DViewProps) {
  return (
    <div className="flex h-full w-full">
      <div className="relative flex flex-1 items-center justify-center p-4 border-r border-border overflow-hidden">
        <Preview3DView
          dataUrl={leftDataUrl}
          shape={shape}
          textureRepeat={textureRepeat}
        />
        <span className="absolute bottom-2 left-2 border border-border/50 bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground backdrop-blur-sm">
          {leftLabel}
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-center p-4 overflow-hidden">
        <Preview3DView
          dataUrl={rightDataUrl}
          shape={shape}
          textureRepeat={textureRepeat}
        />
        <span className="absolute bottom-2 right-2 border border-border/50 bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground backdrop-blur-sm">
          {rightLabel} (current)
        </span>
      </div>
    </div>
  )
}
