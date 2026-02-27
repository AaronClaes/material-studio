'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconDownload, IconLoader2 } from '@tabler/icons-react'
import {
  PreviewSettingsPanel,
  PreviewToolbar,
  PreviewViewport,
} from '@/features/preview/components'
import type { WorkflowRun } from '@/features/workflow/lib/run-store'
import type { StudioNode } from '@/features/workflow/types'
import type { CompareCandidate, PreviewSettings } from '@/features/preview/components'
import { useSettingsStore } from '@/shared/stores/settings-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useRunNavigation } from './use-run-navigation'
import { RunResultsSidebar } from './run-results-sidebar'
import { RunChainPanel } from './run-chain-panel'
import { downloadAll, downloadCurrent } from './run-download'
import { formatDuration, formatTimestamp } from './run-utils'

interface RunOverviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  run: WorkflowRun | null
  nodes: Array<StudioNode>
}

interface EphemeralState {
  compareId: string | null
  viewMode: 'split' | 'overlay'
  sliderPos: number
}

const DEFAULT_EPHEMERAL: EphemeralState = {
  compareId: null,
  viewMode: 'split',
  sliderPos: 50,
}

export function RunOverviewDialog({
  open,
  onOpenChange,
  run,
  nodes,
}: RunOverviewDialogProps) {
  const { previewPreferences, setPreviewPreferences } = useSettingsStore()
  const [isZipping, setIsZipping] = useState(false)
  const [ephemeral, setEphemeral] = useState<EphemeralState>(DEFAULT_EPHEMERAL)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)

  const {
    activeKey,
    setActiveKey,
    groups,
    flatKeys,
    activeItem,
    currentFlatIndex,
    navigateUp,
    navigateDown,
    reset,
  } = useRunNavigation(run)

  const items = run?.items ?? []

  function handlePreviewSettingsChange(patch: Partial<PreviewSettings>) {
    const { compareId, viewMode, sliderPos, ...persistable } = patch
    if (compareId !== undefined || viewMode !== undefined || sliderPos !== undefined) {
      setEphemeral((s) => ({
        ...s,
        ...(compareId !== undefined && { compareId }),
        ...(viewMode !== undefined && { viewMode }),
        ...(sliderPos !== undefined && { sliderPos }),
      }))
    }
    if (Object.keys(persistable).length > 0) {
      setPreviewPreferences(persistable)
    }
  }

  useEffect(() => {
    setSelectedStepId(null)
    setEphemeral(DEFAULT_EPHEMERAL)
    setShowSettings(false)
  }, [activeKey])

  useEffect(() => {
    reset()
    setEphemeral(DEFAULT_EPHEMERAL)
    setShowSettings(false)
  }, [run, reset])

  const displayStep =
    activeItem?.chain.find((s) => s.nodeId === selectedStepId) ??
    activeItem?.chain.at(-1) ??
    null

  const compareCandidates = useMemo<Array<CompareCandidate>>(() => {
    if (!activeItem) return []
    const currentStepId = selectedStepId ?? activeItem.chain.at(-1)?.nodeId
    return activeItem.chain
      .filter((s) => s.nodeId !== currentStepId && s.outputDataUrl != null)
      .map((s) => ({
        id: s.nodeId,
        label: s.nodeData.label,
        dataUrl: s.outputDataUrl!,
      }))
  }, [activeItem, selectedStepId])

  const previewSettings: PreviewSettings = { ...previewPreferences, ...ephemeral }

  const compareCandidate = compareCandidates.find(
    (c) => c.id === ephemeral.compareId,
  )
  const compareDataUrl = compareCandidate?.dataUrl ?? null
  const compareLabel = compareCandidate?.label ?? null

  const handleDownloadAll = useCallback(async () => {
    if (!run || items.length === 0) return
    setIsZipping(true)
    try {
      await downloadAll(run, items, nodes)
    } finally {
      setIsZipping(false)
    }
  }, [run, items, nodes])

  const handleDownloadCurrent = useCallback(() => {
    if (!displayStep?.outputDataUrl || !activeItem) return
    downloadCurrent(
      displayStep.outputDataUrl,
      activeItem.inputFilename,
      displayStep.nodeData.label,
    )
  }, [displayStep, activeItem])

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
                onClick={handleDownloadAll}
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
            <RunResultsSidebar
              groups={groups}
              activeKey={activeKey}
              onSelectKey={setActiveKey}
              currentFlatIndex={currentFlatIndex}
              flatKeysLength={flatKeys.length}
              onNavigateUp={navigateUp}
              onNavigateDown={navigateDown}
              nodes={nodes}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
              <PreviewToolbar
                settings={previewSettings}
                onSettingsChange={handlePreviewSettingsChange}
                compareCandidates={compareCandidates}
                showSettings={showSettings}
                onShowSettingsChange={setShowSettings}
              />

              <div className="relative flex-1 flex items-center justify-center bg-muted/30 overflow-hidden group/preview min-h-0">
                {showSettings && (
                  <PreviewSettingsPanel
                    settings={previewSettings}
                    onSettingsChange={handlePreviewSettingsChange}
                  />
                )}
                {displayStep?.outputDataUrl ? (
                  <>
                    <PreviewViewport
                      dataUrl={displayStep.outputDataUrl}
                      title={displayStep.nodeData.label}
                      settings={previewSettings}
                      compareDataUrl={compareDataUrl}
                      compareLabel={compareLabel}
                      onSliderChange={(sliderPos) =>
                        setEphemeral((s) => ({ ...s, sliderPos }))
                      }
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 h-8 text-xs gap-1.5 opacity-0 group-hover/preview:opacity-100 transition-opacity shadow-md z-10"
                      onClick={handleDownloadCurrent}
                    >
                      <IconDownload className="size-3.5" />
                      Download
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No output
                  </span>
                )}
              </div>
            </div>

            <RunChainPanel
              activeItem={activeItem}
              selectedStepId={selectedStepId}
              onSelectStep={setSelectedStepId}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
