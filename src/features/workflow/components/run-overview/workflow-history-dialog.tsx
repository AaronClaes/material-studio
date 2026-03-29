'use client'

import { useCallback, useState } from 'react'
import { IconDownload, IconLoader2, IconTrash } from '@tabler/icons-react'
import { ResultItemSidebar } from './result-item-sidebar'
import { RunChainPanel } from './run-chain-panel'
import { RetrySettingsPanel } from './retry-settings-panel'
import { RetryActionBar } from './retry-action-bar'
import { downloadAll, downloadCurrent } from './run-download'
import { RunHistoryPanel } from './run-history-panel'
import type { StudioNode } from '@/features/workflow/types'
import {
  PreviewSettingsPanel,
  PreviewToolbar,
  PreviewViewport,
} from '@/features/preview/components'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/features/workflow/lib/run-utils'
import { useRunOverview } from '@/features/workflow/hooks/use-run-overview'

interface WorkflowHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  nodes: Array<StudioNode>
}

export function WorkflowHistoryDialog({
  open,
  onOpenChange,
  workflowId,
  nodes,
}: WorkflowHistoryDialogProps) {
  const [isZipping, setIsZipping] = useState(false)

  const {
    metaList,
    isHydrating,
    selectedRunId,
    selectRun,
    selectedRun,
    deleteRun,
    renameRun,
    resultGroups,
    flatKeys,
    currentFlatIndex,
    selectedItemKey,
    selectedItem,
    selectItem,
    navigateUp,
    navigateDown,
    displayStep,
    selectStep,
    compareCandidates,
    previewSettings,
    compareDataUrl,
    compareLabel,
    updatePreviewSettings,
    showSettings,
    setShowSettings,
    // Retry
    selectedGroupKeys,
    toggleGroupSelection,
    clearGroupSelection,
    retryStatus,
    retryChain,
    retryDraftSettings,
    retryOriginalSettings,
    retryProgress,
    enterRetryMode,
    exitRetryMode,
    updateRetryNodeData,
    resetRetryNodeData,
    executeRetry,
    commitRetry,
    discardRetry,
    retryAgain,
  } = useRunOverview(workflowId)

  const isInRetryMode = retryStatus !== 'idle'
  const items = selectedRun?.items ?? []

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
    if (!displayStep?.outputDataUrl || !selectedItem) return
    downloadCurrent(
      displayStep.outputDataUrl,
      selectedItem.inputFilename,
      displayStep.nodeData.label,
    )
  }, [displayStep, selectedItem])

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
              {selectedRunId && !isInRetryMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={deleteRun.isPending}
                  onClick={() => deleteRun.mutate(selectedRunId)}
                  title="Delete this run"
                >
                  {deleteRun.isPending ? (
                    <IconLoader2 className="size-3.5 animate-spin" />
                  ) : (
                    <IconTrash className="size-3.5" />
                  )}
                </Button>
              )}
              {items.length > 0 && !isInRetryMode && (
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
          {!isInRetryMode && (
            <RunHistoryPanel
              metaList={metaList}
              selectedRunId={selectedRunId}
              onSelectRun={selectRun}
              onDeleteRun={(id) => deleteRun.mutate(id)}
              onRenameRun={(id, name) => renameRun(id, name)}
              isLoading={false}
            />
          )}

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
              <ResultItemSidebar
                resultGroups={resultGroups}
                selectedItemKey={selectedItemKey}
                onSelectItem={selectItem}
                currentFlatIndex={currentFlatIndex}
                flatKeysLength={flatKeys.length}
                onNavigateUp={navigateUp}
                onNavigateDown={navigateDown}
                nodes={nodes}
                selectedGroupKeys={selectedGroupKeys}
                onToggleGroup={toggleGroupSelection}
                onClearSelection={clearGroupSelection}
                onEnterRetryMode={enterRetryMode}
                retryStatus={retryStatus}
              />

              <div className="flex-1 flex flex-col overflow-hidden">
                <PreviewToolbar
                  settings={previewSettings}
                  onSettingsChange={updatePreviewSettings}
                  compareCandidates={compareCandidates}
                  showSettings={showSettings}
                  onShowSettingsChange={setShowSettings}
                />

                <div className="relative flex-1 flex items-center justify-center bg-muted/30 overflow-hidden group/preview min-h-0">
                  {showSettings && (
                    <PreviewSettingsPanel
                      settings={previewSettings}
                      onSettingsChange={updatePreviewSettings}
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
                          updatePreviewSettings({ sliderPos })
                        }
                      />
                      {!isInRetryMode && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute bottom-4 left-1/2 -translate-x-1/2 h-8 text-xs gap-1.5 opacity-0 group-hover/preview:opacity-100 transition-opacity shadow-md z-10"
                          onClick={handleDownloadCurrent}
                        >
                          <IconDownload className="size-3.5" />
                          Download
                        </Button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {retryStatus === 'running'
                        ? 'Running...'
                        : 'No output'}
                    </span>
                  )}

                  <RetryActionBar
                    status={retryStatus}
                    progress={retryProgress}
                    onCancel={exitRetryMode}
                    onRun={executeRetry}
                    onDiscard={discardRetry}
                    onRetryAgain={retryAgain}
                    onKeep={commitRetry}
                  />
                </div>
              </div>

              {isInRetryMode ? (
                <RetrySettingsPanel
                  chain={retryChain}
                  draftSettings={retryDraftSettings}
                  originalSettings={retryOriginalSettings}
                  onUpdateNodeData={updateRetryNodeData}
                  onResetNodeData={resetRetryNodeData}
                />
              ) : (
                <RunChainPanel
                  selectedItem={selectedItem}
                  selectedStepId={displayStep?.nodeId ?? null}
                  onSelectStep={selectStep}
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
