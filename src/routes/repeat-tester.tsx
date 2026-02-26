import { createFileRoute } from '@tanstack/react-router'
import { IconGrid4x4 } from '@tabler/icons-react'
import { ComingSoon } from '@/components/coming-soon'

export const Route = createFileRoute('/repeat-tester')({
  component: RepeatTesterPage,
})

function RepeatTesterPage() {
  return (
    <ComingSoon
      icon={IconGrid4x4}
      name="Repeat Tester"
      description="Test how textures tile and repeat on surfaces"
    />
  )
}
