import { useEffect, useState } from 'react'
import { ImageView } from './image-view'
import { RepeatView } from './repeat-view'
import { Preview3DView } from './preview-3d-view'
import { SplitView } from './split-view'
import { Split3DView } from './split-3d-view'
import { OverlayView } from './overlay-view'
import type { PreviewSettings } from './types'
import { useModelStore } from '@/lib/model-store'

interface PreviewViewportProps {
  dataUrl: string | null
  title: string
  settings: PreviewSettings
  compareDataUrl: string | null
  compareLabel: string | null
  onSliderChange: (pos: number) => void
}

export function PreviewViewport({
  dataUrl,
  title,
  settings,
  compareDataUrl,
  compareLabel,
  onSliderChange,
}: PreviewViewportProps) {
  const isComparing = settings.compareId !== null && compareDataUrl !== null
  const { models, getBlobUrl } = useModelStore()
  const [customModelUrl, setCustomModelUrl] = useState<string | null>(null)

  const customModel =
    settings.shape === 'custom' && settings.customModelId
      ? models.find((m) => m.id === settings.customModelId)
      : null

  useEffect(() => {
    if (!settings.customModelId || settings.shape !== 'custom') {
      setCustomModelUrl(null)
      return
    }
    getBlobUrl(settings.customModelId).then(setCustomModelUrl)
  }, [settings.customModelId, settings.shape, getBlobUrl])

  if (settings.view === '3d') {
    if (isComparing) {
      return (
        <Split3DView
          leftDataUrl={compareDataUrl}
          rightDataUrl={dataUrl}
          leftLabel={compareLabel ?? 'Compare'}
          rightLabel={title}
          shape={settings.shape}
          textureRepeat={settings.textureRepeat}
          customModelUrl={customModelUrl}
          selectedMaterials={customModel?.selectedMaterials}
        />
      )
    }
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <Preview3DView
          dataUrl={dataUrl}
          shape={settings.shape}
          textureRepeat={settings.textureRepeat}
          customModelUrl={customModelUrl}
          selectedMaterials={customModel?.selectedMaterials}
        />
      </div>
    )
  }

  // Image view
  if (isComparing) {
    if (settings.viewMode === 'split') {
      return (
        <SplitView
          leftDataUrl={compareDataUrl}
          rightDataUrl={dataUrl}
          leftLabel={compareLabel ?? 'Compare'}
          rightLabel={title}
          repeatEnabled={settings.repeatEnabled}
          repeatAmount={settings.repeatAmount}
          showGrid={settings.showGrid}
        />
      )
    }
    return (
      <OverlayView
        leftDataUrl={compareDataUrl}
        rightDataUrl={dataUrl}
        leftLabel={compareLabel ?? 'Compare'}
        rightLabel={title}
        sliderPos={settings.sliderPos}
        onSliderChange={onSliderChange}
        repeatEnabled={settings.repeatEnabled}
        repeatAmount={settings.repeatAmount}
        showGrid={settings.showGrid}
      />
    )
  }

  if (settings.repeatEnabled) {
    return (
      <RepeatView
        dataUrl={dataUrl}
        repeatAmount={settings.repeatAmount}
        showGrid={settings.showGrid}
      />
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <ImageView dataUrl={dataUrl} />
    </div>
  )
}
