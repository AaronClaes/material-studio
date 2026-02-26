import { useEffect, useRef } from 'react'
import { IconTrash, IconUpload } from '@tabler/icons-react'
import { useModelStore } from '@/lib/model-store'
import { Button } from '@/components/ui/button'

export function ModelManager() {
  const { models, loaded, loadModels, addModel, removeModel } = useModelStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadModels()
  }, [loadModels])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await addModel(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (!loaded) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".glb"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <IconUpload size={14} />
          Upload GLB
        </Button>
      </div>

      {models.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No custom models uploaded yet.
        </p>
      )}

      {models.length > 0 && (
        <ul className="space-y-2">
          {models.map((model) => (
            <li
              key={model.id}
              className="flex items-center justify-between border border-border/60 px-3 py-2"
            >
              <div>
                <span className="text-sm">{model.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {model.materialNames.length} material
                  {model.materialNames.length !== 1 ? 's' : ''}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeModel(model.id)}
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
