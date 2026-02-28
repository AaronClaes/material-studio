import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FileCollection } from '../lib/opfs'

export interface CustomEnvironmentMeta {
  id: string
  name: string
  fileName: string
  extension: string
}

interface EnvironmentStore {
  environments: Array<CustomEnvironmentMeta>
  blobUrls: Record<string, string>
  addEnvironment: (file: File) => Promise<void>
  removeEnvironment: (id: string) => void
  getBlobUrl: (id: string) => Promise<string | null>
}

const collection = new FileCollection('environments')

export const useEnvironmentStore = create<EnvironmentStore>()(
  persist(
    (set, get) => ({
      environments: [],
      blobUrls: {},

      addEnvironment: async (file: File) => {
        const id = crypto.randomUUID()
        const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const name = file.name.replace(/\.[^.]+$/, '')
        const fileName = `${id}.${extension}`

        const meta: CustomEnvironmentMeta = { id, name, fileName, extension }

        await collection.writeFile(fileName, file)
        set((s) => ({ environments: [...s.environments, meta] }))
      },

      removeEnvironment: (id: string) => {
        const { blobUrls, environments } = get()
        const env = environments.find((e) => e.id === id)
        if (blobUrls[id]) {
          URL.revokeObjectURL(blobUrls[id])
        }
        set((s) => ({
          environments: s.environments.filter((e) => e.id !== id),
          blobUrls: Object.fromEntries(
            Object.entries(s.blobUrls).filter(([k]) => k !== id),
          ),
        }))
        if (env) {
          collection.deleteFile(env.fileName).catch(() => {})
        }
      },

      getBlobUrl: async (id: string) => {
        const existing = get().blobUrls[id]
        if (existing) return existing
        try {
          const env = get().environments.find((e) => e.id === id)
          if (!env) return null
          const rawUrl = await collection.getFileUrl(env.fileName)
          const url = `${rawUrl}#file.${env.extension}`
          set((s) => ({ blobUrls: { ...s.blobUrls, [id]: url } }))
          return url
        } catch {
          return null
        }
      },
    }),
    {
      name: 'material-studio-environments',
      partialize: (s) => ({ environments: s.environments }),
    },
  ),
)
