import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Preview3DShape, PreviewView } from '@/features/preview/components'
import type {
  MapKey,
  StandardMaterialSettings,
} from '@/features/material-viewer/lib/material-definitions'
import { DEFAULT_STANDARD_MATERIAL_SETTINGS } from '@/features/material-viewer/lib/material-definitions'

interface NotificationSettings {
  enabled: boolean
  notifyOnWorkflowCompletion: boolean
  notifyWhenTabActive: boolean
}

export interface PreviewPreferences {
  view: PreviewView
  shape: Preview3DShape
  customModelId: string | null
  environmentId: string
  textureRepeat: number
  repeatEnabled: boolean
  repeatAmount: number
  showGrid: boolean
}

const DEFAULT_PREVIEW_PREFERENCES: PreviewPreferences = {
  view: 'image',
  shape: 'sphere',
  customModelId: null,
  environmentId: 'sky',
  textureRepeat: 1,
  repeatEnabled: false,
  repeatAmount: 3,
  showGrid: false,
}

interface SettingsStore {
  notifications: NotificationSettings
  setNotifications: (patch: Partial<NotificationSettings>) => void
  previewPreferences: PreviewPreferences
  setPreviewPreferences: (patch: Partial<PreviewPreferences>) => void
  materialViewerDisabledMaps: MapKey[]
  setMaterialViewerDisabledMaps: (keys: MapKey[]) => void
  standardMaterialSettings: StandardMaterialSettings
  setStandardMaterialSettings: (
    patch: Partial<StandardMaterialSettings>,
  ) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      notifications: {
        enabled: false,
        notifyOnWorkflowCompletion: true,
        notifyWhenTabActive: false,
      },
      setNotifications: (patch) =>
        set((s) => ({
          notifications: { ...s.notifications, ...patch },
        })),
      previewPreferences: DEFAULT_PREVIEW_PREFERENCES,
      setPreviewPreferences: (patch) =>
        set((s) => ({
          previewPreferences: { ...s.previewPreferences, ...patch },
        })),
      materialViewerDisabledMaps: [],
      setMaterialViewerDisabledMaps: (keys) =>
        set({ materialViewerDisabledMaps: keys }),
      standardMaterialSettings: DEFAULT_STANDARD_MATERIAL_SETTINGS,
      setStandardMaterialSettings: (patch) =>
        set((s) => ({
          standardMaterialSettings: {
            ...s.standardMaterialSettings,
            ...patch,
          },
        })),
    }),
    { name: 'material-studio-settings' },
  ),
)

export function notify(title: string, options?: NotificationOptions): void {
  const { enabled, notifyOnWorkflowCompletion, notifyWhenTabActive } =
    useSettingsStore.getState().notifications

  if (!enabled) return
  if (!notifyOnWorkflowCompletion) return
  if (Notification.permission !== 'granted') return
  if (!notifyWhenTabActive && document.visibilityState === 'visible') return

  new Notification(title, options)
}
