'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import {
  IconChevronDown,
  IconChevronUp,
  IconChevronsDown,
  IconChevronsUp,
  IconDownload,
  IconLoader2,
} from '@tabler/icons-react'
import type { RunResultItem, WorkflowRun } from '@/lib/run-store'
import type { StudioNode } from '@/types/studio'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RunOverviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  run: WorkflowRun | null
  nodes: Array<StudioNode>
}

interface ResultGroup {
  inputFilename: string
  inputNodeId: string
  items: Array<RunResultItem>
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = Math.round((ms % 60_000) / 1000)
  return `${mins}m ${secs}s`
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

async function downloadBlob(url: string, filename: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function RunOverviewDialog({
  open,
  onOpenChange,
  run,
  nodes,
}: RunOverviewDialogProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [isZipping, setIsZipping] = useState(false)
  const [accordionValue, setAccordionValue] = useState<Array<string>>([])

  const items = run?.items ?? []

  const groups = useMemo<Array<ResultGroup>>(() => {
    const map = new Map<string, ResultGroup>()
    for (const item of items) {
      const key = `${item.inputNodeId}|${item.inputFilename}`
      if (!map.has(key)) {
        map.set(key, {
          inputFilename: item.inputFilename,
          inputNodeId: item.inputNodeId,
          items: [],
        })
      }
      map.get(key)!.items.push(item)
    }
    return [...map.values()]
  }, [items])

  // Flat list of all item keys for navigation
  const flatKeys = useMemo(() => {
    const keys: Array<string> = []
    for (const group of groups) {
      const groupKey = `${group.inputNodeId}|${group.inputFilename}`
      for (let idx = 0; idx < group.items.length; idx++) {
        keys.push(`${groupKey}|${idx}`)
      }
    }
    return keys
  }, [groups])

  const activeItem = useMemo<RunResultItem | null>(() => {
    if (!activeKey) return groups[0]?.items[0] ?? null
    const parts = activeKey.split('|')
    const groupKey = `${parts[0]}|${parts[1]}`
    const itemIdx = Number(parts[2])
    const group = groups.find(
      (g) => `${g.inputNodeId}|${g.inputFilename}` === groupKey,
    )
    return group?.items[itemIdx] ?? null
  }, [activeKey, groups])

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)

  useEffect(() => {
    setSelectedStepId(null)
  }, [activeKey])

  useEffect(() => {
    setActiveKey(null)
    setAccordionValue([])
  }, [run])

  const displayStep =
    activeItem?.chain.find((s) => s.nodeId === selectedStepId) ??
    activeItem?.chain.at(-1) ??
    null

  const nodeLabel = (nodeId: string): string => {
    const n = nodes.find((x) => x.id === nodeId)
    return n?.data.label ?? nodeId
  }

  // Navigation
  const currentFlatIndex = useMemo(() => {
    const effectiveKey = activeKey ?? flatKeys[0]
    if (!effectiveKey) return -1
    return flatKeys.indexOf(effectiveKey)
  }, [activeKey, flatKeys])

  const navigateUp = useCallback(() => {
    if (currentFlatIndex > 0) setActiveKey(flatKeys[currentFlatIndex - 1])
  }, [currentFlatIndex, flatKeys])

  const navigateDown = useCallback(() => {
    if (currentFlatIndex < flatKeys.length - 1)
      setActiveKey(flatKeys[currentFlatIndex + 1])
  }, [currentFlatIndex, flatKeys])

  // Download all as ZIP
  const downloadAll = useCallback(async () => {
    if (!run || items.length === 0) return
    setIsZipping(true)
    try {
      const zip = new JSZip()
      const nameCounters = new Map<string, number>()

      for (const item of items) {
        const folder = item.inputFilename || 'output'
        const baseLabel = nodeLabel(item.outputNodeId).replace(/[/\\]/g, '_')
        const counterKey = `${folder}/${baseLabel}`
        const count = nameCounters.get(counterKey) ?? 0
        nameCounters.set(counterKey, count + 1)
        const suffix = count > 0 ? `_${count + 1}` : ''
        const filename = `${folder}/${baseLabel}${suffix}.png`

        if (item.outputDataUrl) {
          const response = await fetch(item.outputDataUrl)
          const blob = await response.blob()
          zip.file(filename, blob)
        }
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(content)
      a.download = `run-${new Date(run.completedAt).toISOString().slice(0, 19).replace(/[T:]/g, '-')}.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setIsZipping(false)
    }
  }, [run, items, nodes])

  // Download current image
  const downloadCurrent = useCallback(() => {
    if (!displayStep?.outputDataUrl || !activeItem) return
    const inputName = activeItem.inputFilename || 'output'
    const stepLabel = displayStep.nodeData.label.replace(/[/\\]/g, '_')
    downloadBlob(displayStep.outputDataUrl, `${inputName}_${stepLabel}.png`)
  }, [displayStep, activeItem])

  // Accordion controls
  const allStepIds = useMemo(
    () => activeItem?.chain.map((s) => s.nodeId) ?? [],
    [activeItem],
  )
  const openAll = useCallback(() => setAccordionValue(allStepIds), [allStepIds])
  const closeAll = useCallback(() => setAccordionValue([]), [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none sm:max-w-none w-screen h-screen rounded-none p-0 gap-0 flex flex-col"
        showCloseButton
      >
        <DialogHeader className="px-4 pr-12 py-3 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            Run Overview
            {run && (
              <>
                <span className="text-muted-foreground font-normal">
                  {formatTimestamp(run.completedAt)}
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-muted-foreground font-normal tabular-nums">
                  Ran for {formatDuration(run.durationMs)}
                </span>
              </>
            )}
            {items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-7 text-xs gap-1.5"
                disabled={isZipping}
                onClick={downloadAll}
              >
                {isZipping ? (
                  <IconLoader2 className="size-3.5 animate-spin" />
                ) : (
                  <IconDownload className="size-3.5" />
                )}
                Download All
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground text-xs">
            No results to display.
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Left panel — grouped results list */}
            <div className="w-52 border-r shrink-0 flex flex-col overflow-hidden">
              {/* Navigation buttons */}
              <div className="flex items-center justify-center border-b p-1 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={currentFlatIndex <= 0}
                  onClick={navigateUp}
                >
                  <IconChevronUp className="size-3.5" />
                </Button>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {currentFlatIndex + 1} / {flatKeys.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={currentFlatIndex >= flatKeys.length - 1}
                  onClick={navigateDown}
                >
                  <IconChevronDown className="size-3.5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {groups.map((group) => {
                  const groupKey = `${group.inputNodeId}|${group.inputFilename}`
                  const groupLabel =
                    group.inputFilename ||
                    nodeLabel(group.inputNodeId) ||
                    'Input'
                  return (
                    <div key={groupKey} className="mb-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-1 truncate">
                        {groupLabel}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map((item, idx) => {
                          const itemKey = `${groupKey}|${idx}`
                          const isActive =
                            activeKey === itemKey ||
                            (activeKey === null &&
                              group === groups[0] &&
                              idx === 0)
                          return (
                            <button
                              key={itemKey}
                              type="button"
                              onClick={() => setActiveKey(itemKey)}
                              className={cn(
                                'flex items-center gap-1.5 w-full px-1 py-1 text-left transition-colors',
                                isActive ? 'bg-accent' : 'hover:bg-accent/50',
                              )}
                            >
                              {item.outputDataUrl ? (
                                <img
                                  src={item.outputDataUrl}
                                  alt={nodeLabel(item.outputNodeId)}
                                  className="w-8 h-8 object-cover shrink-0 border"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-muted shrink-0 border" />
                              )}
                              <span className="text-[10px] truncate">
                                {nodeLabel(item.outputNodeId)}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Middle panel — full-size preview */}
            <div className="flex-1 relative flex items-center justify-center bg-muted/30 overflow-hidden group/preview">
              {displayStep?.outputDataUrl ? (
                <>
                  <img
                    src={displayStep.outputDataUrl}
                    alt="Result"
                    className="max-w-full max-h-full object-contain p-8"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 h-8 text-xs gap-1.5 opacity-0 group-hover/preview:opacity-100 transition-opacity shadow-md"
                    onClick={downloadCurrent}
                  >
                    <IconDownload className="size-3.5" />
                    Download
                  </Button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">No output</span>
              )}
            </div>

            {/* Right panel — chain accordion */}
            <div className="w-72 border-l shrink-0 flex flex-col overflow-hidden">
              {activeItem ? (
                <>
                  {/* Open All / Close All */}
                  <div className="flex items-center justify-end border-b p-1 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] gap-1 px-2"
                      onClick={openAll}
                    >
                      <IconChevronsDown className="size-3" />
                      Open All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] gap-1 px-2"
                      onClick={closeAll}
                    >
                      <IconChevronsUp className="size-3" />
                      Close All
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <Accordion
                      type="multiple"
                      value={accordionValue}
                      onValueChange={setAccordionValue}
                    >
                      {activeItem.chain.map((step) => {
                        const isSelected =
                          step.nodeId ===
                          (selectedStepId ?? activeItem.chain.at(-1)?.nodeId)
                        return (
                          <AccordionItem
                            key={step.nodeId}
                            value={step.nodeId}
                            className={cn(
                              'border-l-2 transition-colors',
                              isSelected
                                ? 'border-l-primary'
                                : 'border-l-transparent',
                            )}
                          >
                            <AccordionTrigger className="px-4 text-xs gap-2">
                              <span className="truncate">
                                {step.nodeData.label}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-3 space-y-2">
                              {step.outputDataUrl && (
                                <div className="relative group">
                                  <img
                                    src={step.outputDataUrl}
                                    alt={step.nodeData.label}
                                    className="w-full aspect-square object-cover border "
                                  />
                                  {selectedStepId === step.nodeId ? null : (
                                    <div
                                      onClick={() =>
                                        setSelectedStepId(step.nodeId)
                                      }
                                      className="absolute cursor-default top-0 left-0 w-full h-full bg-black/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition group-hover:transition-opacity"
                                    >
                                      <p className="text-sm text-white">
                                        View image
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        )
                      })}
                    </Accordion>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  Select a result
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
