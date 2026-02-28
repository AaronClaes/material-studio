import { AssetManager } from './asset-manager'
import { useEnvironmentStore } from '@/shared/stores/environment-store'

export function EnvironmentManager() {
  const { environments, addEnvironment, removeEnvironment } =
    useEnvironmentStore()

  return (
    <AssetManager
      items={environments.map((e) => ({ id: e.id, name: e.name }))}
      accept=".hdr,.exr,.jpg,.jpeg,.png,.webp"
      uploadLabel="Upload Environment"
      emptyMessage="No custom environments uploaded yet."
      onUpload={addEnvironment}
      onRemove={removeEnvironment}
    />
  )
}
