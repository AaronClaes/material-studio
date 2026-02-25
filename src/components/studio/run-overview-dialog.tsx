'use client'

import { useEffect, useMemo, useState } from 'react'
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

export function RunOverviewDialog({
  open,
  onOpenChange,
  run,
  nodes,
}: RunOverviewDialogProps) {
  // activeKey encodes the selected item as "inputNodeId|inputFilename|itemIdx"
  const [activeKey, setActiveKey] = useState<string | null>(null)

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

  // Resolve the active item from the activeKey
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

  // Reset selected step when active item changes
  useEffect(() => {
    setSelectedStepId(null)
  }, [activeKey])

  // Reset active key when run changes
  useEffect(() => {
    setActiveKey(null)
  }, [run])

  const displayStep =
    activeItem?.chain.find((s) => s.nodeId === selectedStepId) ??
    activeItem?.chain.at(-1) ??
    null

  const nodeLabel = (nodeId: string): string => {
    const n = nodes.find((x) => x.id === nodeId)
    return n?.data.label ?? nodeId
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none sm:max-w-none w-screen h-screen rounded-none p-0 gap-0 flex flex-col"
        showCloseButton
      >
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold">
            Run Overview
            {run && (
              <span className="ml-2 text-muted-foreground font-normal">
                {new Date(run.completedAt).toLocaleTimeString()}
              </span>
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
            <div className="w-52 border-r shrink-0 overflow-y-auto p-2">
              {groups.map((group) => {
                const groupKey = `${group.inputNodeId}|${group.inputFilename}`
                const groupLabel =
                  group.inputFilename || nodeLabel(group.inputNodeId) || 'Input'
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

            {/* Middle panel — full-size preview */}
            <div className="flex-1 flex items-center justify-center bg-muted/30 overflow-hidden">
              {displayStep?.outputDataUrl ? (
                <img
                  src={displayStep.outputDataUrl}
                  alt="Result"
                  className="max-w-full max-h-full object-contain p-8"
                />
              ) : (
                <span className="text-xs text-muted-foreground">No output</span>
              )}
            </div>

            {/* Right panel — chain accordion */}
            <div className="w-72 border-l shrink-0 overflow-y-auto">
              {activeItem ? (
                <Accordion type="multiple">
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
                                  onClick={() => setSelectedStepId(step.nodeId)}
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
