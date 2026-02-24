import {
  IconAlertCircle,
  IconBrandChrome,
  IconCheck,
  IconCpu,
  IconDeviceDesktop,
  IconFolder,
  IconX,
} from '@tabler/icons-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface Requirement {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  status: 'ok' | 'fail'
}

function checkRequirements(): {
  requirements: Array<Requirement>
  blocking: boolean
} {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)

  const hasWebGPU = 'gpu' in navigator

  const hasFsAccess = 'showDirectoryPicker' in window

  const requirements: Array<Requirement> = [
    {
      id: 'desktop',
      label: 'Desktop device',
      description:
        'Material Studio requires a desktop browser. Mobile devices are not supported.',
      icon: <IconDeviceDesktop size={18} />,
      status: isMobile ? 'fail' : 'ok',
    },
    {
      id: 'webgpu',
      label: 'WebGPU',
      description:
        'The GPU processing pipeline requires WebGPU. Available in Chrome 113+, Edge 113+.',
      icon: <IconCpu size={18} />,
      status: hasWebGPU ? 'ok' : 'fail',
    },
    {
      id: 'fs-access',
      label: 'File System Access API',
      description:
        'Required for loading image directories and saving output files. Available in Chrome 86+, Edge 86+.',
      icon: <IconFolder size={18} />,
      status: hasFsAccess ? 'ok' : 'fail',
    },
  ]

  const blocking = requirements.some((r) => r.status === 'fail')

  return { requirements, blocking }
}

export function RequirementsCheck({ children }: { children: React.ReactNode }) {
  const { requirements, blocking } = checkRequirements()

  if (!blocking) return <>{children}</>

  const failCount = requirements.filter((r) => r.status === 'fail').length

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center border border-border bg-muted">
            <IconAlertCircle size={22} className="text-destructive" />
          </div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            Browser not supported
          </h1>
          <p className="text-sm text-muted-foreground">
            {failCount === 1
              ? '1 requirement is'
              : `${failCount} requirements are`}{' '}
            not met by your current environment.
          </p>
        </div>

        {/* Requirements list */}
        <Card className="py-0 gap-0">
          <CardContent className="px-0 py-0">
            {requirements.map((req, i) => (
              <div key={req.id}>
                {i > 0 && <Separator />}
                <div className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5 shrink-0 text-muted-foreground">
                    {req.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-sm font-medium">{req.label}</span>
                      <StatusBadge status={req.status} />
                    </div>
                    {req.status !== 'ok' && (
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                        {req.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="gap-3 text-xs text-muted-foreground">
            <IconBrandChrome size={16} className="shrink-0" />
            <span>
              Use the latest{' '}
              <span className="font-medium text-foreground">Google Chrome</span>{' '}
              or a Chromium-based browser on a desktop computer.
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'ok' | 'fail' }) {
  if (status === 'ok') {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
        <IconCheck />
        Available
      </Badge>
    )
  }

  return (
    <Badge variant="destructive">
      <IconX />
      Not supported
    </Badge>
  )
}
