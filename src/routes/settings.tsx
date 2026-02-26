import { Link, createFileRoute } from '@tanstack/react-router'
import { IconArrowLeft } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useSettingsStore } from '@/lib/settings-store'
import { ModelManager } from '@/components/settings/model-manager'
import { EnvironmentManager } from '@/components/settings/environment-manager'

export const Route = createFileRoute('/settings')({ component: SettingsPage })

function SettingsPage() {
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
    <div className="min-h-screen bg-card text-foreground">
      <div className="max-w-xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" asChild>
            <Link to="/">
              <IconArrowLeft size={16} />
              Back
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        <Separator className="mb-6" />

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
            Ensure your browser is allowed to send notifications in system
            settings.
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

        <Separator className="my-6" />

        <section>
          <h2 className="text-sm font-medium mb-4">3D Preview Models</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Upload custom GLB models to preview textures on real-world meshes.
          </p>
          <ModelManager />
        </section>

        <Separator className="my-6" />

        <section>
          <h2 className="text-sm font-medium mb-4">3D Preview Environments</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Upload custom HDRI or image files to use as environment lighting.
          </p>
          <EnvironmentManager />
        </section>
      </div>
    </div>
  )
}
