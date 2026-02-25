import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationSettings {
  enabled: boolean
  notifyOnWorkflowCompletion: boolean
  notifyWhenTabActive: boolean
}

interface SettingsStore {
  notifications: NotificationSettings
  setNotifications: (patch: Partial<NotificationSettings>) => void
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
