import { useState } from 'react'
import { IconRefresh } from '@tabler/icons-react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

export interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  defaultValue?: number
  onChange: (v: number) => void
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue = 0,
  onChange,
}: SliderRowProps) {
  const [draft, setDraft] = useState<string | null>(null)

  function commit(raw: string) {
    setDraft(null)
    const decimals = step < 1 ? (step.toString().split('.')[1]?.length ?? 0) : 0
    const parsed =
      decimals > 0
        ? parseFloat(Number(raw).toFixed(decimals))
        : Math.round(Number(raw))
    if (!Number.isFinite(parsed)) return
    onChange(Math.max(min, Math.min(max, parsed)))
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <Label className="text-xs">{label}</Label>
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            disabled={value === defaultValue}
            className="text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-0 disabled:pointer-events-none transition-opacity"
          >
            <IconRefresh size={10} />
          </button>
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={draft ?? value}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(e.currentTarget.value)
            if (e.key === 'Escape') setDraft(null)
            e.stopPropagation()
          }}
          className="w-10 text-xs text-right tabular-nums text-muted-foreground bg-transparent border-0 outline-none p-0 focus:text-foreground"
        />
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => { if (v !== undefined) onChange(v) }}
        className="h-4"
      />
    </div>
  )
}
