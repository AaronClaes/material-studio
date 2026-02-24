import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'

import { RequirementsCheck } from '@/components/studio/requirements-check'

const StudioCanvas = lazy(() =>
  import('@/components/studio/studio-canvas').then((m) => ({
    default: m.StudioCanvas,
  })),
)

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <RequirementsCheck>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">
            Loading canvas…
          </div>
        }
      >
        <StudioCanvas />
      </Suspense>
    </RequirementsCheck>
  )
}
