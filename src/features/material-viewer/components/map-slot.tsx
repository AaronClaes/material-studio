import { useRef, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import type { MapDef, MapKey } from '../lib/material-definitions'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface MapSlotProps {
  def: MapDef
  dataUrl: string | undefined
  onUpload: (dataUrl: string) => void
  onRemove: () => void
  isExternalDragTarget: boolean
  onDragTargetEnter: (key: MapKey) => void
  onDragTargetLeave: () => void
}

export function MapSlot({
  def,
  dataUrl,
  onUpload,
  onRemove,
  isExternalDragTarget,
  onDragTargetEnter,
  onDragTargetLeave,
}: MapSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  function readFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') onUpload(result)
    }
    reader.readAsDataURL(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
    onDragTargetEnter(def.key)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
      onDragTargetLeave()
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    onDragTargetLeave()
    const file = e.dataTransfer.files[0]
    if (!file) return
    readFile(file)
  }

  const isHighlighted = isDragOver || isExternalDragTarget

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
        {def.label}
      </span>
      <div
        className={cn(
          'group relative flex h-10 flex-1 cursor-pointer items-center justify-center overflow-hidden border transition-colors',
          dataUrl ? 'border-border' : 'border-dashed border-border/60',
          isHighlighted && 'border-primary bg-primary/10',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={def.label}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs text-muted-foreground/40">
            Drop or click
          </span>
        )}
        {dataUrl && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute right-0.5 top-0.5 h-5 w-5 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <IconX size={10} />
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) readFile(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
