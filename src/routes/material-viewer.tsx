import { createFileRoute } from '@tanstack/react-router'
import { IconBox } from '@tabler/icons-react'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/material-viewer')({
  component: MaterialViewerPage,
})

function MaterialViewerPage() {
  return (
    <ComingSoon
      icon={IconBox}
      name="Material Viewer"
      description="Upload PBR maps and preview them on 3D models"
    />
  )
}
