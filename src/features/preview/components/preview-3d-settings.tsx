import { IconPlus } from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'
import { TextureRepeatControl } from './texture-repeat-control'
import type { PreviewSettings } from '../types'
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
import { useModelStore } from '@/shared/stores/model-store'
import { useEnvironmentStore } from '@/shared/stores/environment-store'
import { Separator } from '@/components/ui/separator'

export function Preview3DSettingsContent({
  settings,
  onSettingsChange,
}: {
  settings: PreviewSettings
  onSettingsChange: (patch: Partial<PreviewSettings>) => void
}) {
  const { models, updateSelectedMaterials } = useModelStore()
  const { environments } = useEnvironmentStore()

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
            {models.length > 0 && (
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
            {environments.length > 0 && (
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
