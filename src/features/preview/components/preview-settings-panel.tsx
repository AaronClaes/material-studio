import { TextureRepeatControl } from './texture-repeat-control'
import { Preview3DSettingsContent } from './preview-3d-settings'
import type { PreviewSettings } from '../types'
import { Checkbox } from '@/components/ui/checkbox'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/shared/lib/utils'

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
