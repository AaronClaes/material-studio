import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IconUpload } from '@tabler/icons-react'
import type { PreviewSettings } from '@/features/preview/types'
import {
  loadRepeatTesterImage,
  saveRepeatTesterImage,
} from '@/shared/lib/image-opfs'
import {
  PreviewSettingsPanel,
  PreviewToolbar,
} from '@/features/preview/components/preview-toolbar'
import { PreviewViewport } from '@/features/preview/components/preview-viewport'
import { useSettingsStore } from '@/shared/stores/settings-store'
import { cn } from '@/shared/lib/utils'

export function RepeatTesterPage() {
  const queryClient = useQueryClient()
  const { previewPreferences, setPreviewPreferences } = useSettingsStore()
  const { data: dataUrl = null } = useQuery({
    queryKey: ['repeat-tester-image'],
    queryFn: loadRepeatTesterImage,
  })

  const [sliderPos, setSliderPos] = useState(50)
  const [showSettings, setShowSettings] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const settings: PreviewSettings = {
    ...previewPreferences,
    compareId: null,
    viewMode: 'split',
    sliderPos,
  }

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        const blob = await fetch(result).then((r) => r.blob())
        await saveRepeatTesterImage(blob)
        queryClient.invalidateQueries({ queryKey: ['repeat-tester-image'] })
      }
    }
    reader.readAsDataURL(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    loadFile(file)
  }

  function handleSettingsChange(patch: Partial<PreviewSettings>) {
    const {
      compareId: _c,
      viewMode: _vm,
      sliderPos: sp,
      ...persistable
    } = patch
    if (sp !== undefined) setSliderPos(sp)
    if (Object.keys(persistable).length > 0) setPreviewPreferences(persistable)
  }

  return (
    <div
      className="flex h-full w-full flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {!dataUrl ? (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center transition-colors',
            isDragging && 'bg-primary/5',
          )}
        >
          <label>
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileInput}
            />
            <div
              className={cn(
                'cursor-pointer border-2 border-dashed border-border p-16 text-center transition-colors hover:border-primary/60',
                isDragging && 'border-primary',
              )}
            >
              <IconUpload
                size={40}
                className="mx-auto mb-4 text-muted-foreground"
                strokeWidth={1}
              />
              <p className="text-sm font-medium">
                Drop an image or click to upload
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PNG, JPG, EXR, WebP…
              </p>
            </div>
          </label>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <PreviewToolbar
            settings={settings}
            onSettingsChange={handleSettingsChange}
            compareCandidates={null}
            showSettings={showSettings}
            onShowSettingsChange={setShowSettings}
          />
          <div className="relative flex-1 overflow-hidden">
            {showSettings && (
              <PreviewSettingsPanel
                settings={settings}
                onSettingsChange={handleSettingsChange}
              />
            )}
            <PreviewViewport
              dataUrl={dataUrl}
              title="Repeat Tester"
              settings={settings}
              compareDataUrl={null}
              compareLabel={null}
              onSliderChange={setSliderPos}
            />
            {isDragging && (
              <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-primary bg-primary/10" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
