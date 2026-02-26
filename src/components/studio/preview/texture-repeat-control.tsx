import { useState } from 'react'
import { Slider } from '@/components/ui/slider'

export function TextureRepeatControl({
  label = 'Texture repeat',
  value,
  min,
  max,
  onChange,
}: {
  label?: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  function clamp(next: number) {
    return Math.max(min, Math.min(max, next))
  }

  function commit(raw: string) {
    setDraft(null)
    const parsed = Math.round(Number(raw))
    if (!Number.isFinite(parsed)) return
    onChange(clamp(parsed))
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
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
          className="w-12 text-xs text-right tabular-nums text-muted-foreground bg-transparent border-0 outline-none p-0 focus:text-foreground"
        />
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([next]) => onChange(clamp(next))}
        className="h-4"
      />
    </div>
  )
}
