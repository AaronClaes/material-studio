import { AssetManager } from './asset-manager'
import { useModelStore } from '@/shared/stores/model-store'

export function ModelManager() {
  const { models, addModel, removeModel } = useModelStore()

  return (
    <AssetManager
      items={models.map((m) => ({
        id: m.id,
        name: m.name,
        subtitle: `${m.materialNames.length} material${m.materialNames.length !== 1 ? 's' : ''}`,
      }))}
      accept=".glb"
      uploadLabel="Upload GLB"
      emptyMessage="No custom models uploaded yet."
      onUpload={addModel}
      onRemove={removeModel}
    />
  )
}
