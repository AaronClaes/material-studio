import { create } from 'zustand'
import { STORE_CUSTOM_ENVIRONMENTS, openDB } from './model-db'

export interface CustomEnvironmentMeta {
  id: string
  name: string
  extension: string
}

interface CustomEnvironmentRecord extends CustomEnvironmentMeta {
  data: ArrayBuffer
}

interface EnvironmentStore {
  environments: Array<CustomEnvironmentMeta>
  dataUrls: Record<string, string>
  loaded: boolean
  loadEnvironments: () => Promise<void>
  addEnvironment: (file: File) => Promise<void>
  removeEnvironment: (id: string) => void
  getDataUrl: (id: string) => Promise<string | null>
}

// Maps file extension to the MIME type Drei's useEnvironment recognizes
function mimeTypeForExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'hdr':
      return 'application/hdr'
    case 'exr':
      return 'application/exr'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

function arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return `data:${mimeType};base64,${btoa(binary)}`
}

async function saveRecord(record: CustomEnvironmentRecord): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_CUSTOM_ENVIRONMENTS, 'readwrite')
  tx.objectStore(STORE_CUSTOM_ENVIRONMENTS).put(record)
  db.close()
}

async function deleteRecord(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_CUSTOM_ENVIRONMENTS, 'readwrite')
  tx.objectStore(STORE_CUSTOM_ENVIRONMENTS).delete(id)
  db.close()
}

async function loadAllRecords(): Promise<Array<CustomEnvironmentRecord>> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_ENVIRONMENTS, 'readonly')
    const request = tx.objectStore(STORE_CUSTOM_ENVIRONMENTS).getAll()
    request.onsuccess = () => {
      db.close()
      resolve(request.result as Array<CustomEnvironmentRecord>)
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
    const tx = db.transaction(STORE_CUSTOM_ENVIRONMENTS, 'readonly')
    const request = tx.objectStore(STORE_CUSTOM_ENVIRONMENTS).get(id)
    request.onsuccess = () => {
      db.close()
      const record = request.result as CustomEnvironmentRecord | undefined
      resolve(record?.data ?? null)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export const useEnvironmentStore = create<EnvironmentStore>((set, get) => ({
  environments: [],
  dataUrls: {},
  loaded: false,

  loadEnvironments: async () => {
    if (get().loaded) return
    try {
      const records = await loadAllRecords()
      const environments: Array<CustomEnvironmentMeta> = records.map(
        ({ id, name, extension }) => ({ id, name, extension }),
      )
      set({ environments, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  addEnvironment: async (file: File) => {
    const data = await file.arrayBuffer()
    const id = crypto.randomUUID()
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const name = file.name.replace(/\.[^.]+$/, '')
    const record: CustomEnvironmentRecord = { id, name, extension, data }
    await saveRecord(record)
    set((s) => ({ environments: [...s.environments, { id, name, extension }] }))
  },

  removeEnvironment: (id: string) => {
    set((s) => ({
      environments: s.environments.filter((e) => e.id !== id),
      dataUrls: Object.fromEntries(
        Object.entries(s.dataUrls).filter(([k]) => k !== id),
      ),
    }))
    deleteRecord(id).catch(() => {})
  },

  getDataUrl: async (id: string) => {
    const existing = get().dataUrls[id]
    if (existing) return existing
    try {
      const data = await loadRecordData(id)
      if (!data) return null
      const ext =
        get().environments.find((e) => e.id === id)?.extension ?? 'jpg'
      const dataUrl = arrayBufferToDataUrl(data, mimeTypeForExtension(ext))
      set((s) => ({ dataUrls: { ...s.dataUrls, [id]: dataUrl } }))
      return dataUrl
    } catch {
      return null
    }
  },
}))
