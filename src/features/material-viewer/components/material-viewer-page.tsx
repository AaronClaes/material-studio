import { useState } from 'react'
import type {
  MapKey,
  MaterialType,
} from '../lib/material-definitions'
import type { PreviewSettings } from '@/features/preview/components'
import {
  MATERIAL_MAPS,
  MATERIAL_TYPES,
  MATERIAL_TYPE_LABELS,
} from '../lib/material-definitions'
import { MapSlot } from './map-slot'
import { Viewer3D } from './viewer-3d'
import {
  Preview3DSettingsContent,
  useCustomModelUrl,
  useEnvironmentFile,
} from '@/features/preview/components'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSettingsStore } from '@/shared/stores/settings-store'
import { useModelStore } from '@/shared/stores/model-store'

export function MaterialViewerPage() {
  const [materialType, setMaterialType] = useState<MaterialType>(
    'MeshStandardMaterial',
  )
  const [maps, setMaps] = useState<Partial<Record<MapKey, string>>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [dragTargetKey, setDragTargetKey] = useState<MapKey | null>(null)
  const { previewPreferences, setPreviewPreferences } = useSettingsStore()
  const { models } = useModelStore()

  const environmentFile = useEnvironmentFile(previewPreferences.environmentId)
  const customModelUrl = useCustomModelUrl(
    previewPreferences.shape,
    previewPreferences.customModelId,
  )

  const mapDefs = MATERIAL_MAPS[materialType]

  const customModel =
    previewPreferences.shape === 'custom' && previewPreferences.customModelId
      ? (models.find((m) => m.id === previewPreferences.customModelId) ?? null)
      : null

  const settings3D: PreviewSettings = {
    ...previewPreferences,
    compareId: null,
    viewMode: 'split',
    sliderPos: 50,
    view: '3d',
  }

  function loadFileIntoMap(file: File, key: MapKey) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        setMaps((prev) => ({ ...prev, [key]: result }))
      }
    }
    reader.readAsDataURL(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
    setDragTargetKey(null)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    const targetKey = dragTargetKey ?? 'map'
    setDragTargetKey(null)
    loadFileIntoMap(file, targetKey)
  }

  return (
    <div className="flex h-full w-full">
      <div
        className="relative flex-1 overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragLeave}
        onDrop={handleDrop}
      >
        <Viewer3D
          maps={maps}
          mapDefs={mapDefs}
          materialType={materialType}
          shape={previewPreferences.shape}
          textureRepeat={previewPreferences.textureRepeat}
          environmentFile={environmentFile}
          customModelUrl={customModelUrl}
          selectedMaterials={customModel?.selectedMaterials}
        />
        {isDragging && !dragTargetKey && (
          <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-primary bg-primary/10" />
        )}
      </div>

      <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border/60 bg-background">
        <div className="shrink-0 border-b border-border/60 p-3">
          <span className="mb-1.5 block text-xs text-muted-foreground">
            Material Type
          </span>
          <Select
            value={materialType}
            onValueChange={(v) => setMaterialType(v as MaterialType)}
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_TYPES.map((type) => (
                <SelectItem key={type} value={type} className="text-xs">
                  {MATERIAL_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-1 p-3">
            {mapDefs.map((def) => (
              <MapSlot
                key={def.key}
                def={def}
                dataUrl={maps[def.key]}
                onUpload={(dataUrl) =>
                  setMaps((prev) => ({ ...prev, [def.key]: dataUrl }))
                }
                onRemove={() =>
                  setMaps((prev) => {
                    const next = { ...prev }
                    delete next[def.key]
                    return next
                  })
                }
                isExternalDragTarget={dragTargetKey === def.key}
                onDragTargetEnter={(key) => setDragTargetKey(key)}
                onDragTargetLeave={() => setDragTargetKey(null)}
              />
            ))}
          </div>
        </div>

        <Separator />

        <div className="shrink-0 p-3">
          <Preview3DSettingsContent
            settings={settings3D}
            onSettingsChange={setPreviewPreferences}
          />
        </div>
      </aside>
    </div>
  )
}
