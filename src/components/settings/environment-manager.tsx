import { useEffect } from 'react'
import { AssetManager } from './asset-manager'
import { useEnvironmentStore } from '@/lib/environment-store'

export function EnvironmentManager() {
  const {
    environments,
    loaded,
    loadEnvironments,
    addEnvironment,
    removeEnvironment,
  } = useEnvironmentStore()

  useEffect(() => {
    loadEnvironments()
  }, [loadEnvironments])

  return (
    <AssetManager
      items={environments.map((e) => ({ id: e.id, name: e.name }))}
      loaded={loaded}
      accept=".hdr,.exr,.jpg,.jpeg,.png,.webp"
      uploadLabel="Upload Environment"
      emptyMessage="No custom environments uploaded yet."
      onUpload={addEnvironment}
      onRemove={removeEnvironment}
    />
  )
}
