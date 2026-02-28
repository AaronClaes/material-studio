import { useSuspenseQuery } from '@tanstack/react-query'
import type { Preview3DShape } from '../types'
import { useEnvironmentStore } from '@/shared/stores/environment-store'
import { useModelStore } from '@/shared/stores/model-store'

export const PRESET_ENV_FILES: Record<string, string> = {
  sky: '/hdri/sky-env.jpg',
  city: '/hdri/city-env.jpg',
  outdoor: '/hdri/outdoor-env.jpg',
  studio: '/hdri/studio-env.jpg',
}

export function useEnvironmentFile(environmentId: string): string {
  const { getBlobUrl: getEnvBlobUrl } = useEnvironmentStore()

  const { data } = useSuspenseQuery({
    queryKey: ['environment-file', environmentId],
    queryFn: async () => {
      if (environmentId.startsWith('custom:')) {
        const id = environmentId.slice(7)
        const url = await getEnvBlobUrl(id)
        return url ?? '/hdri/sky-env.jpg'
      }
      return PRESET_ENV_FILES[environmentId] ?? '/hdri/sky-env.jpg'
    },
  })

  return data
}

export function useCustomModelUrl(
  shape: Preview3DShape,
  customModelId: string | null,
): string | null {
  const { getBlobUrl } = useModelStore()

  const { data } = useSuspenseQuery({
    queryKey: ['custom-model-url', shape, customModelId],
    queryFn: async () => {
      if (!customModelId || shape !== 'custom') return null
      return getBlobUrl(customModelId)
    },
  })

  return data
}
