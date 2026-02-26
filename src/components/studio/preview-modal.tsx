import { useEffect, useMemo, useState } from 'react'
import {
  PreviewSettingsPanel,
  PreviewToolbar,
  PreviewViewport,
} from './preview'
import type { CompareCandidate, PreviewSettings, PreviewView } from './preview'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useActiveWorkflow } from '@/lib/workflow-store'
import { useSettingsStore } from '@/lib/settings-store'

export type { PreviewView }

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
  const { previewPreferences, setPreviewPreferences } = useSettingsStore()
  const [ephemeral, setEphemeral] = useState<EphemeralState>(DEFAULT_EPHEMERAL)
  const [showSettings, setShowSettings] = useState(false)

  const workflow = useActiveWorkflow()

  const compareCandidates = useMemo<Array<CompareCandidate>>(() => {
    if (!workflow) return []
    return workflow.nodes
      .filter(
        (n) =>
          n.id !== nodeId &&
          (workflow.results[n.id]?.status === 'done' ||
            workflow.results[n.id]?.status === 'skipped') &&
          workflow.results[n.id]?.outputDataUrl != null,
      )
      .map((n) => ({
        id: n.id,
        label: n.data.label,
        dataUrl: workflow.results[n.id]!.outputDataUrl!,
      }))
  }, [workflow, nodeId])

  const compareCandidate = compareCandidates.find(
    (c) => c.id === ephemeral.compareId,
  )
  const compareDataUrl = compareCandidate?.dataUrl ?? null
  const compareLabel = compareCandidate?.label ?? null

  // Reset ephemeral fields on close
  useEffect(() => {
    if (!open) {
      setEphemeral(DEFAULT_EPHEMERAL)
      setShowSettings(false)
    }
  }, [open])

  const currentView = onViewChange ? activeView : previewPreferences.view

  function handleSettingsChange(patch: Partial<PreviewSettings>) {
    if (patch.view != null && onViewChange) {
      onViewChange(patch.view)
    }
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

  const settings: PreviewSettings = {
    ...previewPreferences,
    ...ephemeral,
    view: currentView,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[85vh] min-h-[480px] max-h-[900px] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2">
          <div className="min-w-0 pl-2">
            <DialogTitle className="truncate text-sm font-semibold">
              {title}
            </DialogTitle>
          </div>
          <DialogClose />
        </DialogHeader>

        <PreviewToolbar
          settings={settings}
          onSettingsChange={handleSettingsChange}
          compareCandidates={compareCandidates}
          showSettings={showSettings}
          onShowSettingsChange={setShowSettings}
        />

        <div className="relative flex min-h-0 flex-1 bg-muted/40">
          {showSettings && (
            <PreviewSettingsPanel
              settings={settings}
              onSettingsChange={handleSettingsChange}
            />
          )}
          <PreviewViewport
            dataUrl={dataUrl}
            title={title}
            settings={settings}
            compareDataUrl={compareDataUrl}
            compareLabel={compareLabel}
            onSliderChange={(sliderPos) => setEphemeral((s) => ({ ...s, sliderPos }))}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
