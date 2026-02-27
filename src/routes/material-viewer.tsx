import { createFileRoute } from '@tanstack/react-router'
import { MaterialViewerPage } from '@/features/material-viewer/components/material-viewer-page'

export const Route = createFileRoute('/material-viewer')({
  component: MaterialViewerPage,
})
