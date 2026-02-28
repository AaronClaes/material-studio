const DB_NAME = 'material-studio'
const DB_VERSION = 4

const STORE_DIRECTORY_HANDLES = 'directory-handles'

export { STORE_DIRECTORY_HANDLES }

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_DIRECTORY_HANDLES)) {
        db.createObjectStore(STORE_DIRECTORY_HANDLES)
      }
      // Remove old stores that have been migrated to OPFS
      if (db.objectStoreNames.contains('custom-models')) {
        db.deleteObjectStore('custom-models')
      }
      if (db.objectStoreNames.contains('custom-environments')) {
        db.deleteObjectStore('custom-environments')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
