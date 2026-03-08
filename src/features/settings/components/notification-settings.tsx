import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useSettingsStore } from '@/shared/stores/settings-store'

export function NotificationSettings() {
  const { notifications, setNotifications } = useSettingsStore()
  const [permissionDenied, setPermissionDenied] = useState(false)

  async function handleToggleEnabled(checked: boolean) {
    if (!checked) {
      setNotifications({ enabled: false })
      setPermissionDenied(false)
      return
    }
    const result = await Notification.requestPermission()
    if (result === 'granted') {
      setNotifications({ enabled: true })
      setPermissionDenied(false)
    } else {
      setPermissionDenied(true)
    }
  }

  return (
    <section>
      <h2 className="text-sm font-medium mb-4">Notifications</h2>

      <div className="flex items-center justify-between mb-1">
        <Label
          htmlFor="notifications-enabled"
          className="text-sm cursor-pointer"
        >
          Enable browser notifications
        </Label>
        <Switch
          id="notifications-enabled"
          checked={notifications.enabled}
          onCheckedChange={handleToggleEnabled}
        />
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Ensure your browser is allowed to send notifications in system settings.
      </p>

      {permissionDenied && (
        <p className="text-xs text-muted-foreground mb-4">
          Browser permission denied — update site settings to allow
          notifications.
        </p>
      )}

      {notifications.enabled && (
        <div className="mt-4 space-y-3 pl-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
            Notify for
          </p>

          <div className="flex items-center gap-2">
            <Checkbox
              id="notify-completion"
              checked={notifications.notifyOnWorkflowCompletion}
              onCheckedChange={(checked) =>
                setNotifications({ notifyOnWorkflowCompletion: !!checked })
              }
            />
            <Label
              htmlFor="notify-completion"
              className="text-sm cursor-pointer"
            >
              Workflow completion
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="notify-tab-active"
              checked={notifications.notifyWhenTabActive}
              onCheckedChange={(checked) =>
                setNotifications({ notifyWhenTabActive: !!checked })
              }
            />
            <Label
              htmlFor="notify-tab-active"
              className="text-sm cursor-pointer"
            >
              Send notification even when tab is active
            </Label>
          </div>
        </div>
      )}
    </section>
  )
}
