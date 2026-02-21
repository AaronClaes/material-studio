import { create } from 'zustand'

interface DirectoryStore {
  handles: Record<string, FileSystemDirectoryHandle | undefined>
  setHandle: (nodeId: string, handle: FileSystemDirectoryHandle) => void
  clearHandle: (nodeId: string) => void
}

export const useDirectoryStore = create<DirectoryStore>((set) => ({
  handles: {},
  setHandle: (nodeId, handle) =>
    set((s) => ({ handles: { ...s.handles, [nodeId]: handle } })),
  clearHandle: (nodeId) =>
    set((s) => {
      const { [nodeId]: _removed, ...rest } = s.handles
      return { handles: rest }
    }),
}))
