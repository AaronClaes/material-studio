import { useEffect, useState } from 'react'
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
  const { environments, getDataUrl: getEnvDataUrl } = useEnvironmentStore()
  const [environmentFile, setEnvironmentFile] = useState('/hdri/sky-env.jpg')

  useEffect(() => {
    if (environmentId.startsWith('custom:')) {
      const id = environmentId.slice(7)
      getEnvDataUrl(id).then((url) => {
        if (url) setEnvironmentFile(url)
      })
    } else {
      setEnvironmentFile(PRESET_ENV_FILES[environmentId] ?? '/hdri/sky-env.jpg')
    }
  }, [environmentId, environments, getEnvDataUrl])

  return environmentFile
}

export function useCustomModelUrl(
  shape: Preview3DShape,
  customModelId: string | null,
): string | null {
  const { getBlobUrl } = useModelStore()
  const [customModelUrl, setCustomModelUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!customModelId || shape !== 'custom') {
      setCustomModelUrl(null)
      return
    }
    getBlobUrl(customModelId).then(setCustomModelUrl)
  }, [customModelId, shape, getBlobUrl])

  return customModelUrl
}
