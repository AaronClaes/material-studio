import { DEFAULT_STANDARD_MATERIAL_SETTINGS } from '../lib/material-definitions'
import type { StandardMaterialSettings } from '../lib/material-definitions'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

interface Props {
  settings: StandardMaterialSettings
  onChange: (patch: Partial<StandardMaterialSettings>) => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/60 first:mt-0">
      {children}
    </p>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v!)}
        className="flex-1"
      />
      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}
      </span>
    </div>
  )
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <label className="relative flex cursor-pointer items-center gap-1.5">
        <div
          className="h-5 w-8 shrink-0 border border-border"
          style={{ backgroundColor: value }}
        />
        <span className="text-xs text-muted-foreground">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}

function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <Switch checked={value} onCheckedChange={onChange} className="scale-75" />
    </div>
  )
}

export function StandardMaterialSettingsContent({ settings, onChange }: Props) {
  return (
    <div className="space-y-1.5">
      <SectionLabel>Surface</SectionLabel>
      <SliderRow
        label="Roughness"
        value={settings.roughness}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => onChange({ roughness: v })}
      />
      <SliderRow
        label="Metalness"
        value={settings.metalness}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => onChange({ metalness: v })}
      />

      <SectionLabel>Color</SectionLabel>
      <ColorRow
        label="Base Color"
        value={settings.color}
        onChange={(v) => onChange({ color: v })}
      />
      <ColorRow
        label="Emissive"
        value={settings.emissive}
        onChange={(v) => onChange({ emissive: v })}
      />
      <SliderRow
        label="Emissive Intensity"
        value={settings.emissiveIntensity}
        min={0}
        max={3}
        step={0.01}
        onChange={(v) => onChange({ emissiveIntensity: v })}
      />

      <SectionLabel>Maps</SectionLabel>
      <SliderRow
        label="Normal Scale"
        value={settings.normalScale}
        min={0}
        max={3}
        step={0.01}
        onChange={(v) => onChange({ normalScale: v })}
      />
      <SliderRow
        label="AO Intensity"
        value={settings.aoMapIntensity}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => onChange({ aoMapIntensity: v })}
      />
      <SliderRow
        label="Displace Scale"
        value={settings.displacementScale}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => onChange({ displacementScale: v })}
      />
      <SliderRow
        label="Displace Bias"
        value={settings.displacementBias}
        min={-0.5}
        max={0.5}
        step={0.01}
        onChange={(v) => onChange({ displacementBias: v })}
      />

      <SectionLabel>Rendering</SectionLabel>
      <SwitchRow
        label="Wireframe"
        value={settings.wireframe}
        onChange={(v) => onChange({ wireframe: v })}
      />
      <SwitchRow
        label="Flat Shading"
        value={settings.flatShading}
        onChange={(v) => onChange({ flatShading: v })}
      />

      <div className="pt-3">
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-full text-xs"
          onClick={() => onChange(DEFAULT_STANDARD_MATERIAL_SETTINGS)}
        >
          Reset to defaults
        </Button>
      </div>
    </div>
  )
}
