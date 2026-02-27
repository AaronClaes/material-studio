import { useEffect } from 'react'
import { AssetManager } from './asset-manager'
import { useModelStore } from '@/shared/stores/model-store'

export function ModelManager() {
  const { models, loaded, loadModels, addModel, removeModel } = useModelStore()

  useEffect(() => {
    loadModels()
  }, [loadModels])

  return (
    <AssetManager
      items={models.map((m) => ({
        id: m.id,
        name: m.name,
        subtitle: `${m.materialNames.length} material${m.materialNames.length !== 1 ? 's' : ''}`,
      }))}
      loaded={loaded}
      accept=".glb"
      uploadLabel="Upload GLB"
      emptyMessage="No custom models uploaded yet."
      onUpload={addModel}
      onRemove={removeModel}
    />
  )
}
