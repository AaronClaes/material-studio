import { Suspense, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MATERIAL_MAPS,
  MATERIAL_TYPES,
  MATERIAL_TYPE_LABELS,
} from '../lib/material-definitions'
import { MapSlot } from './map-slot'
import { Viewer3D } from './viewer-3d'
import { StandardMaterialSettingsContent } from './standard-material-settings'
import type { PreviewSettings } from '@/features/preview/components'
import type { MapKey, MaterialType } from '../lib/material-definitions'
import {
  deleteMaterialViewerMap,
  loadMaterialViewerMaps,
  saveMaterialViewerMap,
} from '@/shared/lib/image-opfs'
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
import { cn } from '@/shared/lib/utils'

export function MaterialViewerPage() {
  return (
    <Suspense>
      <MaterialViewerPageInner />
    </Suspense>
  )
}

type SidebarTab = 'maps' | 'properties'

function MaterialViewerPageInner() {
  const queryClient = useQueryClient()
  const [materialType, setMaterialType] = useState<MaterialType>(
    'MeshStandardMaterial',
  )
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('maps')

  const { data: maps = {} } = useQuery({
    queryKey: ['material-viewer-maps'],
    queryFn: loadMaterialViewerMaps,
  })

  const [isDragging, setIsDragging] = useState(false)
  const [dragTargetKey, setDragTargetKey] = useState<MapKey | null>(null)

  const {
    previewPreferences,
    setPreviewPreferences,
    materialViewerDisabledMaps,
    setMaterialViewerDisabledMaps,
    standardMaterialSettings,
    setStandardMaterialSettings,
  } = useSettingsStore()

  const { models } = useModelStore()

  const environmentFile = useEnvironmentFile(previewPreferences.environmentId)
  const customModelUrl = useCustomModelUrl(
    previewPreferences.shape,
    previewPreferences.customModelId,
  )

  const mapDefs = MATERIAL_MAPS[materialType]
  const disabledMapsSet = useMemo(
    () => new Set<MapKey>(materialViewerDisabledMaps),
    [materialViewerDisabledMaps],
  )

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

  function handleMaterialTypeChange(type: MaterialType) {
    setMaterialType(type)
    if (type !== 'MeshStandardMaterial' && sidebarTab === 'properties') {
      setSidebarTab('maps')
    }
  }

  function toggleDisabledMap(key: MapKey) {
    const next = disabledMapsSet.has(key)
      ? materialViewerDisabledMaps.filter((k) => k !== key)
      : [...materialViewerDisabledMaps, key]
    setMaterialViewerDisabledMaps(next)
  }

  function loadFileIntoMap(file: File, key: MapKey) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        const blob = await fetch(result).then((r) => r.blob())
        await saveMaterialViewerMap(key, blob)
        queryClient.invalidateQueries({ queryKey: ['material-viewer-maps'] })
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
    if (!file) return
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
          disabledMaps={disabledMapsSet}
          materialSettings={
            materialType === 'MeshStandardMaterial'
              ? standardMaterialSettings
              : undefined
          }
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
            onValueChange={(v) => handleMaterialTypeChange(v as MaterialType)}
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

        <div className="flex shrink-0 border-b border-border/60">
          {(['maps', 'properties'] as SidebarTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              disabled={
                tab === 'properties' && materialType !== 'MeshStandardMaterial'
              }
              className={cn(
                'flex-1 py-2 text-xs font-medium transition-colors',
                sidebarTab === tab
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
                tab === 'properties' &&
                  materialType !== 'MeshStandardMaterial' &&
                  'cursor-not-allowed opacity-40',
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {sidebarTab === 'maps' ? (
            <div className="space-y-1 p-3">
              {mapDefs.map((def) => (
                <MapSlot
                  key={def.key}
                  def={def}
                  dataUrl={maps[def.key]}
                  isDisabled={disabledMapsSet.has(def.key)}
                  onToggleDisabled={() => toggleDisabledMap(def.key)}
                  onUpload={async (dataUrl) => {
                    const blob = await fetch(dataUrl).then((r) => r.blob())
                    await saveMaterialViewerMap(def.key, blob)
                    queryClient.invalidateQueries({
                      queryKey: ['material-viewer-maps'],
                    })
                  }}
                  onRemove={async () => {
                    await deleteMaterialViewerMap(def.key)
                    queryClient.invalidateQueries({
                      queryKey: ['material-viewer-maps'],
                    })
                  }}
                  isExternalDragTarget={dragTargetKey === def.key}
                  onDragTargetEnter={(key) => setDragTargetKey(key)}
                  onDragTargetLeave={() => setDragTargetKey(null)}
                />
              ))}
            </div>
          ) : (
            <div className="p-3">
              <StandardMaterialSettingsContent
                settings={standardMaterialSettings}
                onChange={setStandardMaterialSettings}
              />
            </div>
          )}
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
