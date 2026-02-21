import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'

const StudioCanvas = lazy(() =>
  import('@/components/studio/studio-canvas').then((m) => ({
    default: m.StudioCanvas,
  })),
)

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">
          Loading canvas…
        </div>
      }
    >
      <StudioCanvas />
    </Suspense>
  )
}
