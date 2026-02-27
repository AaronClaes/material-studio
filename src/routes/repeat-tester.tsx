import { createFileRoute } from '@tanstack/react-router'
import { RepeatTesterPage } from '@/features/repeat-tester/components/repeat-tester-page'

export const Route = createFileRoute('/repeat-tester')({
  component: RepeatTesterPage,
})
