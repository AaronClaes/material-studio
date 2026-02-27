import { useEffect, useState } from 'react'
import { IconChevronDown, IconPlus, IconSettings } from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'
import { TextureRepeatControl } from './texture-repeat-control'
import type { CompareCandidate, PreviewSettings, PreviewView } from './types'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { useModelStore } from '@/lib/model-store'
import { useEnvironmentStore } from '@/lib/environment-store'
import { Separator } from '@/components/ui/separator'

const COMPARE_NONE_VALUE = '__none__'

interface PreviewToolbarProps {
  settings: PreviewSettings
  onSettingsChange: (patch: Partial<PreviewSettings>) => void
  compareCandidates: Array<CompareCandidate> | null
  showSettings?: boolean
  onShowSettingsChange?: (show: boolean) => void
  className?: string
}

export function PreviewToolbar({
  settings,
  onSettingsChange,
  compareCandidates,
  showSettings: controlledShowSettings,
  onShowSettingsChange,
  className,
}: PreviewToolbarProps) {
  const [internalShowSettings, setInternalShowSettings] = useState(false)
  const showSettings = controlledShowSettings ?? internalShowSettings
  const setShowSettings = onShowSettingsChange ?? setInternalShowSettings

  const isComparing =
    settings.compareId !== null &&
    compareCandidates?.some((c) => c.id === settings.compareId)
  const hasCompareCandidates = compareCandidates && compareCandidates.length > 0

  function handleViewChange(view: PreviewView) {
    const patch: Partial<PreviewSettings> = { view }
    if (view === '3d' && settings.viewMode === 'overlay') {
      patch.viewMode = 'split'
    }
    onSettingsChange(patch)
  }

  return (
    <>
      {/* Header bar */}
      <div
        className={cn(
          'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-1.5 border-b border-border/60 bg-background/80 shrink-0',
          className,
        )}
      >
        {/* Left — Compare */}
        <div className="flex items-center gap-2">
          {compareCandidates !== null && (
            <Select
              value={settings.compareId ?? COMPARE_NONE_VALUE}
              onValueChange={(val) =>
                onSettingsChange({
                  compareId: val === COMPARE_NONE_VALUE ? null : val,
                })
              }
              disabled={!hasCompareCandidates}
            >
              <SelectTrigger className="h-7 w-40 text-xs">
                <SelectValue
                  placeholder={
                    hasCompareCandidates ? 'Compare with…' : 'No candidates'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={COMPARE_NONE_VALUE} className="text-xs">
                  None
                </SelectItem>
                {compareCandidates.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {compareCandidates !== null && isComparing && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={settings.viewMode}
              onValueChange={(v) => {
                if (v === 'split' || v === 'overlay') {
                  onSettingsChange({ viewMode: v })
                }
              }}
              spacing={0}
            >
              <ToggleGroupItem value="split" className="px-2 text-xs h-7">
                Split
              </ToggleGroupItem>
              {settings.view === 'image' && (
                <ToggleGroupItem value="overlay" className="px-2 text-xs h-7">
                  Overlay
                </ToggleGroupItem>
              )}
            </ToggleGroup>
          )}
        </div>

        {/* Center — View toggle */}
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={settings.view}
          onValueChange={(v) => {
            if (v === 'image' || v === '3d') handleViewChange(v)
          }}
          spacing={0}
        >
          <ToggleGroupItem value="image" className="px-2 text-xs h-7">
            Image
          </ToggleGroupItem>
          <ToggleGroupItem value="3d" className="px-2 text-xs h-7">
            3D
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Right — Settings button */}
        <div className="flex items-center justify-end">
          <Button
            size="sm"
            variant={showSettings ? 'secondary' : 'outline'}
            onClick={() => setShowSettings(!showSettings)}
            aria-expanded={showSettings}
          >
            <IconSettings size={12} />
            Settings
            <IconChevronDown
              size={12}
              className={cn(
                'transition-transform',
                showSettings && 'rotate-180',
              )}
            />
          </Button>
        </div>
      </div>
    </>
  )
}

export function Preview3DSettingsContent({
  settings,
  onSettingsChange,
}: {
  settings: PreviewSettings
  onSettingsChange: (patch: Partial<PreviewSettings>) => void
}) {
  const { models, loaded, loadModels, updateSelectedMaterials } =
    useModelStore()
  const {
    environments,
    loaded: envsLoaded,
    loadEnvironments,
  } = useEnvironmentStore()

  useEffect(() => {
    loadModels()
  }, [loadModels])

  useEffect(() => {
    loadEnvironments()
  }, [loadEnvironments])

  const customModel = settings.customModelId
    ? models.find((m) => m.id === settings.customModelId)
    : null

  function handleShapeChange(value: string) {
    if (value.startsWith('custom:')) {
      const modelId = value.slice(7)
      onSettingsChange({ shape: 'custom', customModelId: modelId })
    } else {
      onSettingsChange({
        shape: value as PreviewSettings['shape'],
        customModelId: null,
      })
    }
  }

  const selectValue =
    settings.shape === 'custom' && settings.customModelId
      ? `custom:${settings.customModelId}`
      : settings.shape

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Geometry</span>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" asChild>
            <Link to="/settings">
              <IconPlus size={12} />
            </Link>
          </Button>
        </div>
        <Select value={selectValue} onValueChange={handleShapeChange}>
          <SelectTrigger className="h-7 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sphere" className="text-xs">
              Sphere
            </SelectItem>
            <SelectItem value="cube" className="text-xs">
              Cube
            </SelectItem>
            <SelectItem value="plane" className="text-xs">
              Plane
            </SelectItem>
            {loaded && models.length > 0 && (
              <>
                <SelectSeparator />
                {models.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={`custom:${model.id}`}
                    className="text-xs"
                  >
                    {model.name}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {settings.shape === 'custom' && customModel && (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">
            Apply texture to
          </span>
          <div className="flex flex-wrap gap-3 items-center">
            {customModel.materialNames.map((matName) => (
              <label
                key={matName}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={customModel.selectedMaterials.includes(matName)}
                  onCheckedChange={(checked) => {
                    const selected = checked
                      ? [...customModel.selectedMaterials, matName]
                      : customModel.selectedMaterials.filter(
                          (n) => n !== matName,
                        )
                    updateSelectedMaterials(customModel.id, selected)
                  }}
                />
                <span className="text-xs truncate">{matName}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Environment</span>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" asChild>
            <Link to="/settings">
              <IconPlus size={12} />
            </Link>
          </Button>
        </div>
        <Select
          value={settings.environmentId}
          onValueChange={(value) => onSettingsChange({ environmentId: value })}
        >
          <SelectTrigger className="h-7 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sky" className="text-xs">
              Sky
            </SelectItem>
            <SelectItem value="city" className="text-xs">
              City
            </SelectItem>
            <SelectItem value="outdoor" className="text-xs">
              Outdoor
            </SelectItem>
            <SelectItem value="studio" className="text-xs">
              Studio
            </SelectItem>
            {envsLoaded && environments.length > 0 && (
              <>
                <SelectSeparator />
                {environments.map((env) => (
                  <SelectItem
                    key={env.id}
                    value={`custom:${env.id}`}
                    className="text-xs"
                  >
                    {env.name}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <TextureRepeatControl
        label="Texture repeat"
        value={settings.textureRepeat}
        min={1}
        max={20}
        onChange={(textureRepeat) => onSettingsChange({ textureRepeat })}
      />
    </div>
  )
}

export function PreviewSettingsPanel({
  settings,
  onSettingsChange,
  className,
}: {
  settings: PreviewSettings
  onSettingsChange: (patch: Partial<PreviewSettings>) => void
  className?: string
}) {
  return (
    <aside
      className={cn(
        'absolute inset-y-0 right-0 z-20 w-72 border-l border-border/60 bg-background/95 p-3',
        className,
      )}
    >
      <div className="h-full space-y-3 overflow-y-auto">
        {settings.view === 'image' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Repeat</span>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={settings.repeatEnabled ? 'on' : 'off'}
                onValueChange={(val) => {
                  if (val === 'on' || val === 'off') {
                    onSettingsChange({ repeatEnabled: val === 'on' })
                  }
                }}
                spacing={0}
                className="w-full"
              >
                <ToggleGroupItem value="off" className="flex-1 text-xs">
                  Off
                </ToggleGroupItem>
                <ToggleGroupItem value="on" className="flex-1 text-xs">
                  On
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            {settings.repeatEnabled && (
              <>
                <TextureRepeatControl
                  label="Amount"
                  value={settings.repeatAmount}
                  min={1}
                  max={8}
                  onChange={(repeatAmount) =>
                    onSettingsChange({ repeatAmount })
                  }
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={settings.showGrid}
                    onCheckedChange={(checked) =>
                      onSettingsChange({ showGrid: checked === true })
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    Show grid
                  </span>
                </label>
              </>
            )}
          </div>
        )}

        {settings.view === '3d' && (
          <Preview3DSettingsContent
            settings={settings}
            onSettingsChange={onSettingsChange}
          />
        )}
      </div>
    </aside>
  )
}
