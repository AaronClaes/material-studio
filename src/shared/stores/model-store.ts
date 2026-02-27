import { create } from 'zustand'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Mesh } from 'three'
import { STORE_CUSTOM_MODELS, openDB } from './indexed-db'
import type { Material } from 'three'

export interface CustomModelMeta {
  id: string
  name: string
  materialNames: Array<string>
  selectedMaterials: Array<string>
}

interface CustomModelRecord extends CustomModelMeta {
  data: ArrayBuffer
}

interface ModelStore {
  models: Array<CustomModelMeta>
  blobUrls: Record<string, string>
  loaded: boolean
  loadModels: () => Promise<void>
  addModel: (file: File) => Promise<void>
  removeModel: (id: string) => void
  updateSelectedMaterials: (id: string, selected: Array<string>) => void
  getBlobUrl: (id: string) => Promise<string | null>
}

function extractMaterialNames(data: ArrayBuffer): Promise<Array<string>> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
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
        resolve(Array.from(names))
      },
      (error) => reject(error),
    )
  })
}

async function saveRecord(record: CustomModelRecord): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_CUSTOM_MODELS, 'readwrite')
  tx.objectStore(STORE_CUSTOM_MODELS).put(record)
  db.close()
}

async function deleteRecord(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_CUSTOM_MODELS, 'readwrite')
  tx.objectStore(STORE_CUSTOM_MODELS).delete(id)
  db.close()
}

async function loadAllRecords(): Promise<Array<CustomModelRecord>> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_MODELS, 'readonly')
    const request = tx.objectStore(STORE_CUSTOM_MODELS).getAll()
    request.onsuccess = () => {
      db.close()
      resolve(request.result as Array<CustomModelRecord>)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

async function loadRecordData(id: string): Promise<ArrayBuffer | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_MODELS, 'readonly')
    const request = tx.objectStore(STORE_CUSTOM_MODELS).get(id)
    request.onsuccess = () => {
      db.close()
      const record = request.result as CustomModelRecord | undefined
      resolve(record?.data ?? null)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export const useModelStore = create<ModelStore>((set, get) => ({
  models: [],
  blobUrls: {},
  loaded: false,

  loadModels: async () => {
    if (get().loaded) return
    try {
      const records = await loadAllRecords()
      const models: Array<CustomModelMeta> = records.map(
        ({ id, name, materialNames, selectedMaterials }) => ({
          id,
          name,
          materialNames,
          selectedMaterials,
        }),
      )
      set({ models, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  addModel: async (file: File) => {
    const data = await file.arrayBuffer()
    const materialNames = await extractMaterialNames(data.slice(0))
    const id = crypto.randomUUID()
    const name = file.name.replace(/\.glb$/i, '')
    const record: CustomModelRecord = {
      id,
      name,
      materialNames,
      selectedMaterials: [...materialNames],
      data,
    }
    await saveRecord(record)
    const meta: CustomModelMeta = {
      id,
      name,
      materialNames,
      selectedMaterials: [...materialNames],
    }
    set((s) => ({ models: [...s.models, meta] }))
  },

  removeModel: (id: string) => {
    const { blobUrls } = get()
    if (blobUrls[id]) {
      URL.revokeObjectURL(blobUrls[id])
    }
    set((s) => ({
      models: s.models.filter((m) => m.id !== id),
      blobUrls: Object.fromEntries(
        Object.entries(s.blobUrls).filter(([k]) => k !== id),
      ),
    }))
    deleteRecord(id).catch(() => {})
  },

  updateSelectedMaterials: (id: string, selected: Array<string>) => {
    set((s) => ({
      models: s.models.map((m) =>
        m.id === id ? { ...m, selectedMaterials: selected } : m,
      ),
    }))
    // Persist the change to IDB
    const model = get().models.find((m) => m.id === id)
    if (model) {
      loadRecordData(id).then((data) => {
        if (data) {
          saveRecord({ ...model, selectedMaterials: selected, data }).catch(
            () => {},
          )
        }
      })
    }
  },

  getBlobUrl: async (id: string) => {
    const existing = get().blobUrls[id]
    if (existing) return existing
    try {
      const data = await loadRecordData(id)
      if (!data) return null
      const blob = new Blob([data], { type: 'model/gltf-binary' })
      const url = URL.createObjectURL(blob)
      set((s) => ({ blobUrls: { ...s.blobUrls, [id]: url } }))
      return url
    } catch {
      return null
    }
  },
}))
