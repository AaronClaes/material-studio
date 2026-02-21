import { useEffect, useRef, useState } from 'react'
import { IconArrowsHorizontal, IconPhoto, IconX } from '@tabler/icons-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveWorkflow } from '@/lib/workflow-store'
import { cn } from '@/lib/utils'

// PreviewView defines the available viewing modes.
// Extend this union to add future views (e.g. '3d', 'uv', 'normal-map').
export type PreviewView = 'image' | '3d'

interface PreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  dataUrl: string | null
  nodeId?: string
  activeView?: PreviewView
  onViewChange?: (view: PreviewView) => void
}

export function PreviewModal({
  open,
  onOpenChange,
  title,
  dataUrl,
  nodeId,
  activeView = 'image',
}: PreviewModalProps) {
  const [compareNodeId, setCompareNodeId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'split' | 'overlay'>('split')
  const [sliderPos, setSliderPos] = useState(50)

  const workflow = useActiveWorkflow()
  const comparableNodes =
    workflow?.nodes.filter(
      (n) =>
        n.id !== nodeId &&
        (workflow.results[n.id]?.status === 'done' ||
          workflow.results[n.id]?.status === 'skipped') &&
        workflow.results[n.id]?.outputDataUrl != null,
    ) ?? []

  const compareDataUrl = compareNodeId
    ? (workflow?.results[compareNodeId]?.outputDataUrl ?? null)
    : null

  const compareNodeLabel =
    compareNodeId != null
      ? (comparableNodes.find((n) => n.id === compareNodeId)?.data.label ??
        compareNodeId)
      : null

  const isComparing = compareNodeId !== null && compareDataUrl !== null

  useEffect(() => {
    if (!open) {
      setCompareNodeId(null)
      setViewMode('split')
      setSliderPos(50)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-w-5xl flex-col gap-0 p-0 sm:max-w-5xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex flex-row items-center gap-2 p-2">
          <DialogTitle className="text-sm font-semibold ml-2 shrink-0">
            {title}
          </DialogTitle>

          {/* Compare controls */}
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <Select
              value={compareNodeId ?? ''}
              onValueChange={(val) => setCompareNodeId(val || null)}
              disabled={comparableNodes.length === 0}
            >
              <SelectTrigger className="h-7 w-auto min-w-32 text-xs">
                <SelectValue placeholder="Compare with…" />
              </SelectTrigger>
              <SelectContent>
                {comparableNodes.map((n) => (
                  <SelectItem key={n.id} value={n.id} className="text-xs">
                    {n.data.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isComparing && (
              <>
                <div className="flex rounded border border-border overflow-hidden text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={cn(
                      'px-2.5 py-1 transition-colors',
                      viewMode === 'split'
                        ? 'bg-muted text-foreground font-medium'
                        : 'bg-background text-muted-foreground hover:bg-muted/50',
                    )}
                  >
                    Split
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('overlay')}
                    className={cn(
                      'px-2.5 py-1 border-l border-border transition-colors',
                      viewMode === 'overlay'
                        ? 'bg-muted text-foreground font-medium'
                        : 'bg-background text-muted-foreground hover:bg-muted/50',
                    )}
                  >
                    Overlay
                  </button>
                </div>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setCompareNodeId(null)}
                  title="Clear compare"
                  className="shrink-0"
                >
                  <IconX size={12} />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ViewTab label="Image" active={activeView === 'image'} />
            <ViewTab label="3D" active={activeView === '3d'} />
          </div>
          <DialogClose />
        </DialogHeader>

        {/* Content area */}
        <div className="relative flex flex-1 bg-muted/40">
          {activeView === 'image' &&
            (isComparing ? (
              viewMode === 'split' ? (
                <SplitView
                  leftDataUrl={compareDataUrl}
                  rightDataUrl={dataUrl}
                  leftLabel={compareNodeLabel ?? 'Compare'}
                  rightLabel={title}
                />
              ) : (
                <OverlayView
                  leftDataUrl={compareDataUrl}
                  rightDataUrl={dataUrl}
                  leftLabel={compareNodeLabel ?? 'Compare'}
                  rightLabel={title}
                  sliderPos={sliderPos}
                  onSliderChange={setSliderPos}
                />
              )
            ) : (
              <div className="flex min-h-96 w-full items-center justify-center p-6">
                <ImageView dataUrl={dataUrl} />
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ViewTab({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={
        active
          ? 'rounded px-2 py-0.5 bg-muted text-foreground font-medium text-xs'
          : 'rounded px-2 py-0.5 text-muted-foreground text-xs'
      }
    >
      {label}
    </span>
  )
}

function ImageView({ dataUrl }: { dataUrl: string | null }) {
  if (!dataUrl) {
    return (
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <IconPhoto size={48} className="opacity-30" />
        <span className="text-xs">No output yet</span>
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt="Full preview"
      className="max-h-[80vh] max-w-full object-contain"
    />
  )
}

interface SplitViewProps {
  leftDataUrl: string | null
  rightDataUrl: string | null
  leftLabel: string
  rightLabel: string
}

function SplitView({
  leftDataUrl,
  rightDataUrl,
  leftLabel,
  rightLabel,
}: SplitViewProps) {
  return (
    <div className="flex w-full min-h-96">
      <div className="relative flex flex-1 items-center justify-center p-4 border-r border-border overflow-hidden">
        {leftDataUrl ? (
          <img
            src={leftDataUrl}
            alt={leftLabel}
            className="max-h-[70vh] max-w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <IconPhoto size={32} className="opacity-30" />
            <span className="text-xs">No output</span>
          </div>
        )}
        <span className="absolute bottom-2 left-2 rounded bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground backdrop-blur-sm">
          {leftLabel}
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-center p-4 overflow-hidden">
        {rightDataUrl ? (
          <img
            src={rightDataUrl}
            alt={rightLabel}
            className="max-h-[70vh] max-w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <IconPhoto size={32} className="opacity-30" />
            <span className="text-xs">No output</span>
          </div>
        )}
        <span className="absolute bottom-2 right-2 rounded bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground backdrop-blur-sm">
          {rightLabel} (current)
        </span>
      </div>
    </div>
  )
}

interface OverlayViewProps {
  leftDataUrl: string | null
  rightDataUrl: string | null
  leftLabel: string
  rightLabel: string
  sliderPos: number
  onSliderChange: (pos: number) => void
}

function OverlayView({
  leftDataUrl,
  rightDataUrl,
  leftLabel,
  rightLabel,
  sliderPos,
  onSliderChange,
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
      className="relative w-full min-h-[60vh] cursor-col-resize select-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Right image (current) — shown from sliderPos% to right */}
      {rightDataUrl && (
        <img
          src={rightDataUrl}
          alt={rightLabel}
          className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
          draggable={false}
        />
      )}
      {/* Left image (compare) — shown from left to sliderPos% */}
      {leftDataUrl && (
        <img
          src={leftDataUrl}
          alt={leftLabel}
          className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          draggable={false}
        />
      )}

      {/* Drag handle */}
      <div
        className="absolute top-0 bottom-0 w-px bg-white/80 pointer-events-none shadow-sm"
        style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow border border-border/20 flex items-center justify-center">
          <IconArrowsHorizontal size={14} className="text-foreground/60" />
        </div>
      </div>

      {/* Labels */}
      <span className="absolute bottom-2 left-2 rounded bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground pointer-events-none backdrop-blur-sm">
        {leftLabel}
      </span>
      <span className="absolute bottom-2 right-2 rounded bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground pointer-events-none backdrop-blur-sm">
        {rightLabel} (current)
      </span>
    </div>
  )
}
