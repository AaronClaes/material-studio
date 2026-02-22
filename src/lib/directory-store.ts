import { create } from 'zustand'

const DB_NAME = 'material-studio'
const STORE_NAME = 'directory-handles'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function saveHandle(
  nodeId: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).put(handle, nodeId)
  db.close()
}

async function removeHandle(nodeId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).delete(nodeId)
  db.close()
}

async function loadAllHandles(): Promise<
  Record<string, FileSystemDirectoryHandle>
> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.openCursor()
    const result: Record<string, FileSystemDirectoryHandle> = {}
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        result[cursor.key as string] = cursor.value as FileSystemDirectoryHandle
        cursor.continue()
      } else {
        db.close()
        resolve(result)
      }
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite',
): Promise<boolean> {
  if ((await handle.queryPermission({ mode })) === 'granted') return true
  if ((await handle.requestPermission({ mode })) === 'granted') return true
  return false
}

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'bmp',
  'tiff',
  'avif',
])

export async function readDirectoryPreview(
  handle: FileSystemDirectoryHandle,
): Promise<{
  folderName: string
  fileCount: number
  src: string
  srcFilename: string
}> {
  const entries: Array<FileSystemFileHandle> = []
  // @ts-expect-error - values() is not in the type
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file') continue
    const ext = entry.name.split('.').pop()?.toLowerCase() ?? ''
    if (IMAGE_EXTENSIONS.has(ext)) entries.push(entry as FileSystemFileHandle)
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))

  let src = ''
  let srcFilename = ''
  if (entries.length > 0) {
    const file = await entries[0].getFile()
    srcFilename = file.name.replace(/\.[^.]+$/, '')
    src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target!.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  return {
    folderName: handle.name,
    fileCount: entries.length,
    src,
    srcFilename,
  }
}

interface DirectoryStore {
  handles: Record<string, FileSystemDirectoryHandle | undefined>
  setHandle: (nodeId: string, handle: FileSystemDirectoryHandle) => void
  clearHandle: (nodeId: string) => void
  restoreHandles: (
    nodeIds: Array<string>,
    getMode: (nodeId: string) => 'read' | 'readwrite',
  ) => Promise<void>
}

export const useDirectoryStore = create<DirectoryStore>((set) => ({
  handles: {},

  setHandle: (nodeId, handle) => {
    set((s) => ({ handles: { ...s.handles, [nodeId]: handle } }))
    saveHandle(nodeId, handle).catch(() => {})
  },

  clearHandle: (nodeId) => {
    set((s) => {
      const { [nodeId]: _removed, ...rest } = s.handles
      return { handles: rest }
    })
    removeHandle(nodeId).catch(() => {})
  },

  restoreHandles: async (nodeIds, getMode) => {
    try {
      const stored = await loadAllHandles()
      const restored: Record<string, FileSystemDirectoryHandle> = {}

      for (const nodeId of nodeIds) {
        const handle = stored[nodeId]
        if (!handle) continue
        const mode = getMode(nodeId)
        const ok = await verifyPermission(handle, mode)
        if (ok) restored[nodeId] = handle
        else removeHandle(nodeId).catch(() => {})
      }

      // Clean up handles for nodes that no longer exist
      for (const key of Object.keys(stored)) {
        if (!nodeIds.includes(key)) {
          removeHandle(key).catch(() => {})
        }
      }

      if (Object.keys(restored).length > 0) {
        set((s) => ({ handles: { ...s.handles, ...restored } }))
      }
    } catch {
      // IndexedDB unavailable — silently degrade
    }
  },
}))
