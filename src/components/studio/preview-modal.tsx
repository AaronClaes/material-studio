import { Suspense, useEffect, useRef, useState } from 'react'
import { OrbitControls, useTexture } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  IconArrowsHorizontal,
  IconChevronDown,
  IconPhoto,
  IconSettings,
} from '@tabler/icons-react'
import { DoubleSide, RepeatWrapping, SRGBColorSpace } from 'three'
import type { Mesh } from 'three'
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
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useActiveWorkflow } from '@/lib/workflow-store'
import { cn } from '@/lib/utils'

// PreviewView defines the available viewing modes.
// Extend this union to add future views (e.g. '3d', 'uv', 'normal-map').
export type PreviewView = 'image' | '3d'
type Preview3DShape = 'sphere' | 'cube' | 'plane'
const COMPARE_NONE_VALUE = '__none__'

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
  onViewChange,
}: PreviewModalProps) {
  const [compareNodeId, setCompareNodeId] = useState<string | null>(null)
  const [internalView, setInternalView] = useState<PreviewView>(activeView)
  const [viewMode, setViewMode] = useState<'split' | 'overlay'>('split')
  const [sliderPos, setSliderPos] = useState(50)
  const [shape, setShape] = useState<Preview3DShape>('sphere')
  const [textureRepeat, setTextureRepeat] = useState(1)
  const [showSettings, setShowSettings] = useState(false)

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
  const hasComparableNodes = comparableNodes.length > 0
  const currentView = onViewChange ? activeView : internalView

  function handleViewChange(view: PreviewView) {
    if (view === '3d') {
      setViewMode('split')
    }
    if (onViewChange) {
      onViewChange(view)
      return
    }
    setInternalView(view)
  }

  useEffect(() => {
    if (currentView === '3d' && viewMode === 'overlay') {
      setViewMode('split')
    }
  }, [currentView, viewMode])

  useEffect(() => {
    if (!open) {
      setCompareNodeId(null)
      setViewMode('split')
      setSliderPos(50)
      setShowSettings(false)
      if (!onViewChange) {
        setInternalView('image')
      }
    }
  }, [onViewChange, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[85vh] min-h-[480px] max-h-[900px] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 p-2">
          <div className="min-w-0 pl-2">
            <DialogTitle className="truncate text-sm font-semibold">
              {title}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-2 justify-self-center">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={currentView}
              onValueChange={(nextView) => {
                if (nextView === 'image' || nextView === '3d') {
                  handleViewChange(nextView)
                }
              }}
              spacing={0}
            >
              <ToggleGroupItem value="image" className="px-2 text-xs">
                Image
              </ToggleGroupItem>
              <ToggleGroupItem value="3d" className="px-2 text-xs">
                3D
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex items-center gap-2 justify-self-end">
            <Button
              size="xs"
              variant={showSettings ? 'secondary' : 'outline'}
              onClick={() => setShowSettings((v) => !v)}
              aria-expanded={showSettings}
              aria-controls="preview-settings"
            >
              <IconSettings size={12} />
              Settings
              <IconChevronDown
                size={12}
                className={cn('transition-transform', showSettings && 'rotate-180')}
              />
            </Button>
            <DialogClose />
          </div>
        </DialogHeader>

        {/* Content area */}
        <div className="relative flex min-h-0 flex-1 bg-muted/40">
          {showSettings && (
            <aside
              id="preview-settings"
              className="absolute inset-y-0 right-0 z-20 w-72 border-l border-border/60 bg-background/95 p-3"
            >
              <div className="h-full space-y-3 overflow-y-auto">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Compare</span>
                  <Select
                    value={compareNodeId ?? COMPARE_NONE_VALUE}
                    onValueChange={(val) =>
                      setCompareNodeId(
                        val === COMPARE_NONE_VALUE ? null : val,
                      )
                    }
                    disabled={!hasComparableNodes}
                  >
                    <SelectTrigger className="h-7 w-full text-xs">
                      <SelectValue
                        placeholder={
                          hasComparableNodes
                            ? 'Compare with…'
                            : 'No compare candidates'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={COMPARE_NONE_VALUE} className="text-xs">
                        None
                      </SelectItem>
                      {comparableNodes.map((n) => (
                        <SelectItem key={n.id} value={n.id} className="text-xs">
                          {n.data.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isComparing && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Mode</span>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      size="sm"
                      value={viewMode}
                      onValueChange={(nextMode) => {
                        if (nextMode === 'split' || nextMode === 'overlay') {
                          setViewMode(nextMode)
                        }
                      }}
                      spacing={0}
                      className="w-full"
                    >
                      <ToggleGroupItem value="split" className="flex-1 text-xs">
                        Split
                      </ToggleGroupItem>
                      {currentView === 'image' && (
                        <ToggleGroupItem
                          value="overlay"
                          className="flex-1 text-xs"
                        >
                          Overlay
                        </ToggleGroupItem>
                      )}
                    </ToggleGroup>
                  </div>
                )}

                {currentView === '3d' && (
                  <div className="space-y-3 border-t border-border/60 pt-3">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        Geometry
                      </span>
                      <Select
                        value={shape}
                        onValueChange={(value) =>
                          setShape(value as Preview3DShape)
                        }
                      >
                        <SelectTrigger className="h-7 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sphere" className="text-xs">
                            Sphere
                          </SelectItem>
                          <SelectItem value="cube" className="text-xs">
                            Cube
                          </SelectItem>
                          <SelectItem value="plane" className="text-xs">
                            Plane
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <TextureRepeatControl
                      value={textureRepeat}
                      min={1}
                      max={20}
                      onChange={setTextureRepeat}
                    />
                  </div>
                )}
              </div>
            </aside>
          )}

          {currentView === 'image' &&
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
              <div className="flex h-full w-full items-center justify-center p-6">
                <ImageView dataUrl={dataUrl} />
              </div>
            ))}
          {currentView === '3d' &&
            (isComparing ? (
              <Split3DView
                leftDataUrl={compareDataUrl}
                rightDataUrl={dataUrl}
                leftLabel={compareNodeLabel ?? 'Compare'}
                rightLabel={title}
                shape={shape}
                textureRepeat={textureRepeat}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-6">
                <Preview3DView
                  dataUrl={dataUrl}
                  shape={shape}
                  textureRepeat={textureRepeat}
                />
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
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
      className="max-h-full max-w-full object-contain"
    />
  )
}

function Preview3DView({
  dataUrl,
  shape,
  textureRepeat,
}: {
  dataUrl: string | null
  shape: Preview3DShape
  textureRepeat: number
}) {
  if (!dataUrl) {
    return (
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <IconPhoto size={48} className="opacity-30" />
        <span className="text-xs">No output yet</span>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden border border-border/60 bg-background/60">
      <Canvas camera={{ position: [0, 0, 3.3], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 3, 2]} intensity={1.2} />
        <directionalLight position={[-2.5, -2.5, -1.5]} intensity={0.5} />
        <Suspense fallback={null}>
          <TexturedMesh
            dataUrl={dataUrl}
            shape={shape}
            textureRepeat={textureRepeat}
          />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={1.8} maxDistance={5} />
      </Canvas>
    </div>
  )
}

function TexturedMesh({
  dataUrl,
  shape,
  textureRepeat,
}: {
  dataUrl: string
  shape: Preview3DShape
  textureRepeat: number
}) {
  const meshRef = useRef<Mesh | null>(null)
  const texture = useTexture(dataUrl)

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(textureRepeat, textureRepeat)
    texture.needsUpdate = true
  }, [texture, textureRepeat])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.2
  })

  return (
    <mesh
      ref={meshRef}
      rotation={[shape === 'plane' ? 0 : -0.12, 0.3, shape === 'plane' ? 0 : 0.05]}
    >
      {shape === 'sphere' && <sphereGeometry args={[1.1, 64, 64]} />}
      {shape === 'cube' && <boxGeometry args={[1.7, 1.7, 1.7]} />}
      {shape === 'plane' && <planeGeometry args={[2.6, 2.6]} />}
      <meshStandardMaterial
        map={texture}
        side={shape === 'plane' ? DoubleSide : undefined}
      />
    </mesh>
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
    <div className="flex h-full w-full">
      <div className="relative flex flex-1 items-center justify-center p-4 border-r border-border overflow-hidden">
        {leftDataUrl ? (
          <img
            src={leftDataUrl}
            alt={leftLabel}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <IconPhoto size={32} className="opacity-30" />
            <span className="text-xs">No output</span>
          </div>
        )}
        <span className="absolute bottom-2 left-2 border border-border/50 bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground backdrop-blur-sm">
          {leftLabel}
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-center p-4 overflow-hidden">
        {rightDataUrl ? (
          <img
            src={rightDataUrl}
            alt={rightLabel}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <IconPhoto size={32} className="opacity-30" />
            <span className="text-xs">No output</span>
          </div>
        )}
        <span className="absolute bottom-2 right-2 border border-border/50 bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground backdrop-blur-sm">
          {rightLabel} (current)
        </span>
      </div>
    </div>
  )
}

interface Split3DViewProps {
  leftDataUrl: string | null
  rightDataUrl: string | null
  leftLabel: string
  rightLabel: string
  shape: Preview3DShape
  textureRepeat: number
}

function Split3DView({
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

function TextureRepeatControl({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  function clamp(next: number) {
    return Math.max(min, Math.min(max, next))
  }

  function commit(raw: string) {
    setDraft(null)
    const parsed = Math.round(Number(raw))
    if (!Number.isFinite(parsed)) return
    onChange(clamp(parsed))
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Texture repeat</span>
        <input
          type="text"
          inputMode="numeric"
          value={draft ?? value}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(e.currentTarget.value)
            if (e.key === 'Escape') setDraft(null)
            e.stopPropagation()
          }}
          className="w-12 text-xs text-right tabular-nums text-muted-foreground bg-transparent border-0 outline-none p-0 focus:text-foreground"
        />
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([next]) => onChange(clamp(next))}
        className="h-4"
      />
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
      className="relative h-full w-full cursor-col-resize select-none overflow-hidden"
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
