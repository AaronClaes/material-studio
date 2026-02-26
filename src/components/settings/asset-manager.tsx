import { useRef } from 'react'
import { IconTrash, IconUpload } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export interface AssetItem {
  id: string
  name: string
  subtitle?: string
}

interface AssetManagerProps {
  items: Array<AssetItem>
  loaded: boolean
  accept: string
  uploadLabel: string
  emptyMessage: string
  onUpload: (file: File) => Promise<void>
  onRemove: (id: string) => void
}

export function AssetManager({
  items,
  loaded,
  accept,
  uploadLabel,
  emptyMessage,
  onUpload,
  onRemove,
}: AssetManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await onUpload(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (!loaded) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <IconUpload size={14} />
          {uploadLabel}
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between border border-border/60 px-3 py-2"
            >
              <div>
                <span className="text-sm">{item.name}</span>
                {item.subtitle && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {item.subtitle}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item.id)}
              >
                <IconTrash size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
