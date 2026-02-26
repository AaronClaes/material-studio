const DB_NAME = 'material-studio'
const DB_VERSION = 2

const STORE_DIRECTORY_HANDLES = 'directory-handles'
const STORE_CUSTOM_MODELS = 'custom-models'

export { STORE_DIRECTORY_HANDLES, STORE_CUSTOM_MODELS }

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_DIRECTORY_HANDLES)) {
        db.createObjectStore(STORE_DIRECTORY_HANDLES)
      }
      if (!db.objectStoreNames.contains(STORE_CUSTOM_MODELS)) {
        db.createObjectStore(STORE_CUSTOM_MODELS, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
