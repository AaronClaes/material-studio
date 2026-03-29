import { useState } from 'react'
import { IconRefresh } from '@tabler/icons-react'
import type { StudioNodeData } from '@/features/workflow/types'
import { SliderRow } from '@/features/workflow/nodes/slider-row'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NANO_BANANA_MODELS = [
  { value: 'gemini-2.5-flash-image', label: 'Nano Banana' },
  { value: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2' },
  { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro' },
] as const

const ASPECT_RATIOS = [
  '1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1',
  '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9',
]

const IMAGE_SIZES_BY_MODEL: Record<string, Array<string>> = {
  'gemini-2.5-flash-image': ['1K', '2K', '4K'],
  'gemini-3.1-flash-image-preview': ['512', '1K', '2K', '4K'],
  'gemini-3-pro-image-preview': ['1K', '2K', '4K'],
}

interface NodeSettingsEditorProps {
  nodeData: StudioNodeData
  onChange: (patch: Partial<StudioNodeData>) => void
}

export function NodeSettingsEditor({
  nodeData,
  onChange,
}: NodeSettingsEditorProps) {
  switch (nodeData.kind) {
    case 'color':
      return <ColorSettings data={nodeData} onChange={onChange} />
    case 'normalmap':
      return <NormalmapSettings data={nodeData} onChange={onChange} />
    case 'displacement':
      return <DisplacementSettings data={nodeData} onChange={onChange} />
    case 'aomap':
      return <AomapSettings data={nodeData} onChange={onChange} />
    case 'crop':
      return <CropSettings data={nodeData} onChange={onChange} />
    case 'resolution':
      return <ResolutionSettings data={nodeData} onChange={onChange} />
    case 'quilting':
      return <QuiltingSettings data={nodeData} onChange={onChange} />
    case 'nanoBanana':
      return <NanoBananaSettings data={nodeData} onChange={onChange} />
    case 'outputNode':
    case 'googleDriveOutputNode':
      return <OutputSettings data={nodeData} onChange={onChange} />
    default:
      return null
  }
}

/** Returns true if this node kind has editable settings. */
export function hasEditableSettings(kind: string): boolean {
  return [
    'color', 'normalmap', 'displacement', 'aomap',
    'crop', 'resolution', 'quilting', 'nanoBanana',
    'outputNode', 'googleDriveOutputNode',
  ].includes(kind)
}

// --- Color ---

function ColorSettings({
  data,
  onChange,
}: {
  data: Extract<StudioNodeData, { kind: 'color' }>
  onChange: (patch: Partial<StudioNodeData>) => void
}) {
  const [hexDraft, setHexDraft] = useState<string | null>(null)
  const isDefaultTint = data.tintColor.toLowerCase() === '#ffffff'

  function commitHex(raw: string) {
    setHexDraft(null)
    let hex = raw.trim()
    if (!hex.startsWith('#')) hex = `#${hex}`
    if (/^#[0-9a-f]{3}$/i.test(hex)) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    }
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return
    onChange({ tintColor: hex.toLowerCase() })
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Label className="text-xs">Tint</Label>
          <button
            type="button"
            onClick={() => onChange({ tintColor: '#ffffff' })}
            disabled={isDefaultTint}
            className="text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-0 disabled:pointer-events-none transition-opacity"
          >
            <IconRefresh size={10} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={hexDraft ?? data.tintColor}
            maxLength={7}
            spellCheck={false}
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={(e) => commitHex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitHex(e.currentTarget.value)
              if (e.key === 'Escape') setHexDraft(null)
              e.stopPropagation()
            }}
            className="w-14 text-xs text-right font-mono text-muted-foreground bg-transparent border-0 outline-none p-0 focus:text-foreground"
          />
          <input
            type="color"
            value={data.tintColor}
            onChange={(e) => onChange({ tintColor: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer border border-border p-0 bg-transparent"
          />
        </div>
      </div>
      <SliderRow
        label="Brightness"
        value={data.brightness}
        min={-100}
        max={100}
        onChange={(v) => onChange({ brightness: v })}
      />
      <SliderRow
        label="Contrast"
        value={data.contrast}
        min={-100}
        max={100}
        onChange={(v) => onChange({ contrast: v })}
      />
      <SliderRow
        label="Saturation"
        value={data.saturation}
        min={-100}
        max={100}
        onChange={(v) => onChange({ saturation: v })}
      />
      <SliderRow
        label="Hue"
        value={data.hue}
        min={-180}
        max={180}
        onChange={(v) => onChange({ hue: v })}
      />
    </div>
  )
}

// --- Normalmap ---

function NormalmapSettings({
  data,
  onChange,
}: {
  data: Extract<StudioNodeData, { kind: 'normalmap' }>
  onChange: (patch: Partial<StudioNodeData>) => void
}) {
  const invertValues: Array<string> = [
    data.invertR && 'R',
    data.invertG && 'G',
    data.invertHeight && 'Height',
  ].filter((v): v is string => v !== false)

  function handleInvertChange(values: Array<string>) {
    onChange({
      invertR: values.includes('R'),
      invertG: values.includes('G'),
      invertHeight: values.includes('Height'),
    })
  }

  return (
    <div className="space-y-2.5">
      <SliderRow
        label="Strength"
        value={data.strength}
        min={0}
        max={5}
        step={0.1}
        defaultValue={1}
        onChange={(v) => onChange({ strength: v })}
      />
      <SliderRow
        label="Level"
        value={data.level}
        min={4}
        max={10}
        step={1}
        defaultValue={7}
        onChange={(v) => onChange({ level: v })}
      />
      <SliderRow
        label="Blur / Sharp"
        value={data.blurSharp}
        min={-32}
        max={32}
        step={1}
        defaultValue={0}
        onChange={(v) => onChange({ blurSharp: v })}
      />
      <div className="space-y-1">
        <Label className="text-xs">Filter</Label>
        <Select
          value={data.filter}
          onValueChange={(v) => onChange({ filter: v as 'sobel' | 'scharr' })}
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sobel" className="text-xs">Sobel</SelectItem>
            <SelectItem value="scharr" className="text-xs">Scharr</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="border-t border-border/50 pt-2 space-y-2">
        <div className="space-y-1">
          <Label className="text-xs">Invert</Label>
          <ToggleGroup
            type="multiple"
            variant="outline"
            size="sm"
            value={invertValues}
            onValueChange={handleInvertChange}
            className="w-full"
          >
            {(['R', 'G', 'Height'] as const).map((v) => (
              <ToggleGroupItem key={v} value={v} className="flex-1 text-xs h-7">
                {v}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Checkbox
            checked={data.zRange}
            onCheckedChange={(checked) => onChange({ zRange: checked === true })}
          />
          Z Range -1 to +1
        </label>
      </div>
    </div>
  )
}

// --- Displacement ---

function DisplacementSettings({
  data,
  onChange,
}: {
  data: Extract<StudioNodeData, { kind: 'displacement' }>
  onChange: (patch: Partial<StudioNodeData>) => void
}) {
  return (
    <div className="space-y-2.5">
      <SliderRow
        label="Contrast"
        value={data.contrast}
        min={-1}
        max={1}
        step={0.01}
        defaultValue={0}
        onChange={(v) => onChange({ contrast: v })}
      />
      <SliderRow
        label="Blur / Sharp"
        value={data.blurSharp}
        min={-32}
        max={32}
        step={1}
        defaultValue={0}
        onChange={(v) => onChange({ blurSharp: v })}
      />
      <div className="border-t border-border/50 pt-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Checkbox
            checked={data.invert}
            onCheckedChange={(checked) => onChange({ invert: checked === true })}
          />
          Invert
        </label>
      </div>
    </div>
  )
}

// --- AO Map ---

function AomapSettings({
  data,
  onChange,
}: {
  data: Extract<StudioNodeData, { kind: 'aomap' }>
  onChange: (patch: Partial<StudioNodeData>) => void
}) {
  return (
    <div className="space-y-2.5">
      <SliderRow
        label="Strength"
        value={data.strength}
        min={0}
        max={1}
        step={0.01}
        defaultValue={1}
        onChange={(v) => onChange({ strength: v })}
      />
      <SliderRow
        label="Mean"
        value={data.mean}
        min={0}
        max={1}
        step={0.01}
        defaultValue={0.5}
        onChange={(v) => onChange({ mean: v })}
      />
      <SliderRow
        label="Range"
        value={data.range}
        min={0}
        max={1}
        step={0.01}
        defaultValue={0.5}
        onChange={(v) => onChange({ range: v })}
      />
      <SliderRow
        label="Blur / Sharp"
        value={data.blurSharp}
        min={-32}
        max={32}
        step={1}
        defaultValue={0}
        onChange={(v) => onChange({ blurSharp: v })}
      />
      <div className="border-t border-border/50 pt-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Checkbox
            checked={data.invert}
            onCheckedChange={(checked) => onChange({ invert: checked === true })}
          />
          Invert
        </label>
      </div>
    </div>
  )
}

// --- Crop ---

function CropSettings({
  data,
  onChange,
}: {
  data: Extract<StudioNodeData, { kind: 'crop' }>
  onChange: (patch: Partial<StudioNodeData>) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
      {(
        [
          ['x', 'X', data.x],
          ['y', 'Y', data.y],
          ['width', 'W', data.width],
          ['height', 'H', data.height],
        ] as const
      ).map(([key, lbl, val]) => (
        <div key={key} className="space-y-1">
          <Label className="text-xs">{lbl}</Label>
          <Input
            type="number"
            className="h-7 text-xs"
            value={val}
            onChange={(e) => onChange({ [key]: Number(e.target.value) })}
          />
        </div>
      ))}
    </div>
  )
}

// --- Resolution ---

function ResolutionSettings({
  data,
  onChange,
}: {
  data: Extract<StudioNodeData, { kind: 'resolution' }>
  onChange: (patch: Partial<StudioNodeData>) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Width</Label>
          <Input
            type="number"
            className="h-7 text-xs"
            value={data.width}
            onChange={(e) => onChange({ width: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Height</Label>
          <Input
            type="number"
            className="h-7 text-xs"
            value={data.height}
            onChange={(e) => onChange({ height: Number(e.target.value) })}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          className="rounded"
          checked={data.maintainAspect}
          onChange={(e) => onChange({ maintainAspect: e.target.checked })}
        />
        Maintain aspect ratio
      </label>
    </div>
  )
}

// --- Quilting ---

function QuiltingSettings({
  data,
  onChange,
}: {
  data: Extract<StudioNodeData, { kind: 'quilting' }>
  onChange: (patch: Partial<StudioNodeData>) => void
}) {
  return (
    <div className="space-y-2.5">
      <SliderRow
        label="Width"
        value={data.outputWidth}
        min={64}
        max={4096}
        step={64}
        defaultValue={1024}
        onChange={(v) => onChange({ outputWidth: v })}
      />
      <SliderRow
        label="Height"
        value={data.outputHeight}
        min={64}
        max={4096}
        step={64}
        defaultValue={1024}
        onChange={(v) => onChange({ outputHeight: v })}
      />
      <SliderRow
        label="Patch Size"
        value={data.patchSize}
        min={8}
        max={256}
        step={4}
        defaultValue={64}
        onChange={(v) => onChange({ patchSize: v })}
      />
      <SliderRow
        label="Overlap %"
        value={Math.round(data.overlapFraction * 100)}
        min={5}
        max={50}
        step={1}
        defaultValue={17}
        onChange={(v) => onChange({ overlapFraction: v / 100 })}
      />
      <SliderRow
        label="Tolerance"
        value={data.errorTolerance}
        min={1.0}
        max={5.0}
        step={0.1}
        defaultValue={1.5}
        onChange={(v) => onChange({ errorTolerance: v })}
      />
      <SliderRow
        label="Seed"
        value={data.seed}
        min={0}
        max={9999}
        step={1}
        defaultValue={42}
        onChange={(v) => onChange({ seed: v })}
      />
    </div>
  )
}

// --- Nano Banana ---

function NanoBananaSettings({
  data,
  onChange,
}: {
  data: Extract<StudioNodeData, { kind: 'nanoBanana' }>
  onChange: (patch: Partial<StudioNodeData>) => void
}) {
  const availableSizes = IMAGE_SIZES_BY_MODEL[data.model] ?? ['1K', '2K', '4K']

  function handleModelChange(model: string) {
    const sizes = IMAGE_SIZES_BY_MODEL[model] ?? ['1K', '2K', '4K']
    const updates: Partial<StudioNodeData> = { model: model as typeof data.model }
    if (!sizes.includes(data.imageSize)) {
      updates.imageSize = '1K'
    }
    onChange(updates)
  }

  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <Label className="text-xs">Model</Label>
        <Select value={data.model} onValueChange={handleModelChange}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NANO_BANANA_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Prompt</Label>
        <textarea
          value={data.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="Describe the changes to make..."
          rows={3}
          className="w-full resize-y text-xs bg-transparent border border-border px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Aspect Ratio</Label>
        <Select
          value={data.aspectRatio}
          onValueChange={(v) => onChange({ aspectRatio: v })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASPECT_RATIOS.map((ratio) => (
              <SelectItem key={ratio} value={ratio} className="text-xs">
                {ratio}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Output Resolution</Label>
        <Select
          value={data.imageSize}
          onValueChange={(v) => onChange({ imageSize: v })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableSizes.map((size) => (
              <SelectItem key={size} value={size} className="text-xs">
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// --- Output ---

function OutputSettings({
  data,
  onChange,
}: {
  data: Extract<StudioNodeData, { kind: 'outputNode' }> | Extract<StudioNodeData, { kind: 'googleDriveOutputNode' }>
  onChange: (patch: Partial<StudioNodeData>) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-1.5">
        <Label className="text-xs">Filename</Label>
        <Input
          value={data.filename}
          onChange={(e) => onChange({ filename: e.target.value })}
          className="h-7 text-xs"
          placeholder="output"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Format</Label>
        <Select
          value={data.format}
          onValueChange={(v) => onChange({ format: v as 'png' | 'jpg' | 'webp' })}
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="jpg">JPG</SelectItem>
            <SelectItem value="webp">WebP</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
