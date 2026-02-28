'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconDownload, IconLoader2, IconTrash } from '@tabler/icons-react'
import { useRunNavigation } from './use-run-navigation'
import { RunResultsSidebar } from './run-results-sidebar'
import { RunChainPanel } from './run-chain-panel'
import { downloadAll, downloadCurrent } from './run-download'
import { RunHistoryPanel } from './run-history-panel'
import type { StudioNode } from '@/features/workflow/types'
import type {
  CompareCandidate,
  PreviewSettings,
} from '@/features/preview/components'
import {
  PreviewSettingsPanel,
  PreviewToolbar,
  PreviewViewport,
} from '@/features/preview/components'
import { useSettingsStore } from '@/shared/stores/settings-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/features/workflow/lib/run-utils'
import { useRunHistory } from '@/features/workflow/hooks/use-run-history'

interface WorkflowHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
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

export function WorkflowHistoryDialog({
  open,
  onOpenChange,
  workflowId,
  nodes,
}: WorkflowHistoryDialogProps) {
  const { previewPreferences, setPreviewPreferences } = useSettingsStore()
  const [isZipping, setIsZipping] = useState(false)
  const [ephemeral, setEphemeral] = useState<EphemeralState>(DEFAULT_EPHEMERAL)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)

  const {
    metaList,
    isLoading,
    selectedRunId,
    selectRun,
    selectedRun,
    isHydrating,
    deleteRun,
    renameRun,
  } = useRunHistory(workflowId)

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
  } = useRunNavigation(selectedRun)

  const items = selectedRun?.items ?? []

  function handlePreviewSettingsChange(patch: Partial<PreviewSettings>) {
    const { compareId, viewMode, sliderPos, ...persistable } = patch
    if (
      compareId !== undefined ||
      viewMode !== undefined ||
      sliderPos !== undefined
    ) {
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
  }, [selectedRun, reset])

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

  const previewSettings: PreviewSettings = {
    ...previewPreferences,
    ...ephemeral,
  }

  const compareCandidate = compareCandidates.find(
    (c) => c.id === ephemeral.compareId,
  )
  const compareDataUrl = compareCandidate?.dataUrl ?? null
  const compareLabel = compareCandidate?.label ?? null

  const handleDownloadAll = useCallback(async () => {
    if (!selectedRun || items.length === 0) return
    setIsZipping(true)
    try {
      await downloadAll(selectedRun, items, nodes)
    } finally {
      setIsZipping(false)
    }
  }, [selectedRun, items, nodes])

  const handleDownloadCurrent = useCallback(() => {
    if (!displayStep?.outputDataUrl || !activeItem) return
    downloadCurrent(
      displayStep.outputDataUrl,
      activeItem.inputFilename,
      displayStep.nodeData.label,
    )
  }, [displayStep, activeItem])

  const handleDeleteRun = useCallback(() => {
    if (selectedRunId) {
      deleteRun.mutate(selectedRunId)
    }
  }, [selectedRunId, deleteRun])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none sm:max-w-none w-screen h-screen rounded-none p-0 gap-0 flex flex-col"
        showCloseButton
      >
        <DialogHeader className="px-4 pr-12 py-3 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            Run History
            {selectedRun && (
              <>
                <span className="text-muted-foreground font-normal">
                  {selectedRun.name}
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-muted-foreground font-normal tabular-nums">
                  Ran for {formatDuration(selectedRun.durationMs)}
                </span>
              </>
            )}
            <div className="ml-auto flex items-center gap-1">
              {selectedRunId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={deleteRun.isPending}
                  onClick={handleDeleteRun}
                  title="Delete this run"
                >
                  {deleteRun.isPending ? (
                    <IconLoader2 className="size-3.5 animate-spin" />
                  ) : (
                    <IconTrash className="size-3.5" />
                  )}
                </Button>
              )}
              {items.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
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
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <RunHistoryPanel
            metaList={metaList}
            selectedRunId={selectedRunId}
            onSelectRun={selectRun}
            onDeleteRun={(id) => deleteRun.mutate(id)}
            onRenameRun={(id, name) => renameRun(id, name)}
            isLoading={isLoading}
          />

          {isHydrating ? (
            <div className="flex flex-1 items-center justify-center">
              <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-xs">
              {metaList.length === 0
                ? 'No runs yet.'
                : 'No results to display.'}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
