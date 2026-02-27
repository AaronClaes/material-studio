import { useRef } from 'react'
import { IconArrowsHorizontal } from '@tabler/icons-react'
import { RepeatTileGrid } from './repeat-tile-grid'

export interface OverlayViewProps {
  leftDataUrl: string | null
  rightDataUrl: string | null
  leftLabel: string
  rightLabel: string
  sliderPos: number
  onSliderChange: (pos: number) => void
  repeatEnabled?: boolean
  repeatAmount?: number
  showGrid?: boolean
}

export function OverlayView({
  leftDataUrl,
  rightDataUrl,
  leftLabel,
  rightLabel,
  sliderPos,
  onSliderChange,
  repeatEnabled = false,
  repeatAmount = 3,
  showGrid = false,
}: OverlayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    isDragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pos = Math.max(
      0,
      Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
    )
    onSliderChange(pos)
  }

  function handlePointerUp() {
    isDragging.current = false
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-col-resize select-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Right image (current) — shown from sliderPos% to right */}
      {rightDataUrl &&
        (repeatEnabled ? (
          <RepeatTileGrid
            dataUrl={rightDataUrl}
            repeatAmount={repeatAmount}
            showGrid={showGrid}
            className="absolute inset-0 pointer-events-none"
            style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
          />
        ) : (
          <img
            src={rightDataUrl}
            alt={rightLabel}
            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
            style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
            draggable={false}
          />
        ))}
      {/* Left image (compare) — shown from left to sliderPos% */}
      {leftDataUrl &&
        (repeatEnabled ? (
          <RepeatTileGrid
            dataUrl={leftDataUrl}
            repeatAmount={repeatAmount}
            showGrid={showGrid}
            className="absolute inset-0 pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          />
        ) : (
          <img
            src={leftDataUrl}
            alt={leftLabel}
            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            draggable={false}
          />
        ))}

      {/* Drag handle */}
      <div
        className="absolute top-0 bottom-0 w-px bg-white/80 pointer-events-none shadow-sm"
        style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 border border-border/20 bg-white/90 shadow flex items-center justify-center">
          <IconArrowsHorizontal size={14} className="text-foreground/60" />
        </div>
      </div>

      {/* Labels */}
      <span className="absolute bottom-2 left-2 border border-border/50 bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground pointer-events-none backdrop-blur-sm">
        {leftLabel}
      </span>
      <span className="absolute bottom-2 right-2 border border-border/50 bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground pointer-events-none backdrop-blur-sm">
        {rightLabel} (current)
      </span>
    </div>
  )
}
