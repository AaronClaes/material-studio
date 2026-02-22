declare global {
  interface Window {
    showDirectoryPicker: (options?: {
      mode?: 'read' | 'readwrite'
    }) => Promise<FileSystemDirectoryHandle>
  }

  interface FileSystemHandle {
    queryPermission: (
      descriptor?: FileSystemHandlePermissionDescriptor,
    ) => Promise<PermissionState>
    requestPermission: (
      descriptor?: FileSystemHandlePermissionDescriptor,
    ) => Promise<PermissionState>
  }

  interface FileSystemHandlePermissionDescriptor {
    mode?: 'read' | 'readwrite'
  }
}

export const supportsDirectoryPicker =
  typeof window !== 'undefined' && 'showDirectoryPicker' in window

export function useDirectoryPicker(mode: 'read' | 'readwrite'): {
  supportsDirectoryPicker: boolean
  pickDirectory: () => Promise<FileSystemDirectoryHandle | null>
} {
  async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
    try {
      return await window.showDirectoryPicker({ mode })
    } catch {
      // user cancelled
      return null
    }
  }

  return { supportsDirectoryPicker, pickDirectory }
}
