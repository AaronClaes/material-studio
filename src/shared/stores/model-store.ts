import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { Mesh } from 'three'
import { FileCollection } from '../lib/opfs'
import type { Material } from 'three'

export interface CustomModelMeta {
  id: string
  name: string
  fileName: string
  materialNames: Array<string>
  selectedMaterials: Array<string>
}

interface ModelStore {
  models: Array<CustomModelMeta>
  blobUrls: Record<string, string>
  addModel: (file: File) => Promise<void>
  removeModel: (id: string) => void
  updateSelectedMaterials: (id: string, selected: Array<string>) => void
  getBlobUrl: (id: string) => Promise<string | null>
}

const collection = new FileCollection('models')

function extractMaterialNames(data: ArrayBuffer): Promise<Array<string>> {
  return new Promise((resolve, reject) => {
    const draco = new DRACOLoader()
    draco.setDecoderPath(
      'https://www.gstatic.com/draco/versioned/decoders/1.5.5/',
    )
    const loader = new GLTFLoader()
    loader.setDRACOLoader(draco)
    loader.parse(
      data,
      '',
      (gltf) => {
        const names = new Set<string>()
        gltf.scene.traverse((child) => {
          if (child instanceof Mesh) {
            const mesh = child
            const materials: Array<Material> = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material]
            materials.forEach((mat, i) => {
              names.add(mat.name || `Material ${i}`)
            })
          }
        })
        gltf.scene.traverse((child) => {
          if (child instanceof Mesh) {
            const mesh = child as Mesh
            const materials: Array<Material> = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material]
            materials.forEach((mat) => mat.dispose())
            mesh.geometry.dispose()
          }
        })
        draco.dispose()
        resolve(Array.from(names))
      },
      (error) => reject(error),
    )
  })
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set, get) => ({
      models: [],
      blobUrls: {},

      addModel: async (file: File) => {
        const data = await file.arrayBuffer()
        const materialNames = await extractMaterialNames(data.slice(0))
        const id = crypto.randomUUID()
        const name = file.name.replace(/\.glb$/i, '')
        const fileName = `${id}.glb`

        const meta: CustomModelMeta = {
          id,
          name,
          fileName,
          materialNames,
          selectedMaterials: [...materialNames],
        }

        await collection.writeFile(fileName, file)
        set((s) => ({ models: [...s.models, meta] }))
      },

      removeModel: (id: string) => {
        const { blobUrls, models } = get()
        const model = models.find((m) => m.id === id)
        if (blobUrls[id]) {
          URL.revokeObjectURL(blobUrls[id])
        }
        set((s) => ({
          models: s.models.filter((m) => m.id !== id),
          blobUrls: Object.fromEntries(
            Object.entries(s.blobUrls).filter(([k]) => k !== id),
          ),
        }))
        if (model) {
          collection.deleteFile(model.fileName).catch(() => {})
        }
      },

      updateSelectedMaterials: (id: string, selected: Array<string>) => {
        set((s) => ({
          models: s.models.map((m) =>
            m.id === id ? { ...m, selectedMaterials: selected } : m,
          ),
        }))
      },

      getBlobUrl: async (id: string) => {
        const existing = get().blobUrls[id]
        if (existing) return existing
        try {
          const model = get().models.find((m) => m.id === id)
          if (!model) return null
          const url = await collection.getFileUrl(model.fileName)
          set((s) => ({ blobUrls: { ...s.blobUrls, [id]: url } }))
          return url
        } catch {
          return null
        }
      },
    }),
    {
      name: 'material-studio-models',
      partialize: (s) => ({ models: s.models }),
    },
  ),
)
