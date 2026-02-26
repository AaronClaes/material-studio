import { createFileRoute, Link } from '@tanstack/react-router'
import {
  IconBox,
  IconGrid4x4,
  IconHierarchy2,
} from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'

export const Route = createFileRoute('/')({ component: HomePage })

interface FeatureCard {
  icon: Icon
  name: string
  description: string
  to: string
  available: boolean
}

const features: FeatureCard[] = [
  {
    icon: IconHierarchy2,
    name: 'Workflow Editor',
    description: 'Build node-based texture processing pipelines and run them on batches of images.',
    to: '/workflows',
    available: true,
  },
  {
    icon: IconBox,
    name: 'Material Viewer',
    description: 'Upload PBR maps and preview them on 3D models.',
    to: '/material-viewer',
    available: false,
  },
  {
    icon: IconGrid4x4,
    name: 'Repeat Tester',
    description: 'Test how textures tile and repeat on surfaces.',
    to: '/repeat-tester',
    available: false,
  },
]

function HomePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-12 px-8">
      <div className="flex flex-col items-center gap-3">
        <img
          src="/material-studio-logo.png"
          alt="Material Studio"
          className="w-12 h-12"
        />
        <h1 className="text-2xl font-semibold tracking-tight">Material Studio</h1>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-3xl">
        {features.map((feature) => (
          <Card key={feature.to} className="rounded-none flex flex-col">
            <CardHeader className="pb-2">
              <feature.icon size={28} strokeWidth={1.5} className="text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex-1 space-y-1">
              <h2 className="font-semibold text-sm">{feature.name}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </CardContent>
            <CardFooter>
              {feature.available ? (
                <Button size="sm" variant="outline" className="rounded-none" asChild>
                  <Link to={feature.to}>Open →</Link>
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="rounded-none" disabled>
                  Coming Soon
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
