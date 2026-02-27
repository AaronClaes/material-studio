import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'

import { RequirementsCheck } from '@/features/workflow/components/requirements-check'

const StudioCanvas = lazy(() =>
  import('@/features/workflow/components/studio-canvas').then((m) => ({
    default: m.StudioCanvas,
  })),
)

export const Route = createFileRoute('/workflows')({ component: WorkflowsPage })

function WorkflowsPage() {
  return (
    <RequirementsCheck>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Loading canvas…
          </div>
        }
      >
        <StudioCanvas />
      </Suspense>
    </RequirementsCheck>
  )
}
