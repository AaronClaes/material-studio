import { Link } from '@tanstack/react-router'
import { IconArrowLeft } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { NotificationSettings } from './notification-settings'
import { ModelManager } from './model-manager'
import { EnvironmentManager } from './environment-manager'

export function SettingsPage() {
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

        <NotificationSettings />

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
