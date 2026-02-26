import type { Icon } from '@tabler/icons-react'

interface ComingSoonProps {
  icon: Icon
  name: string
  description: string
}

export function ComingSoon({ icon: Icon, name, description }: ComingSoonProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
      <Icon size={48} className="text-muted-foreground" strokeWidth={1} />
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">{name}</h2>
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      </div>
      <span className="text-xs text-muted-foreground/60 uppercase tracking-widest">
        Coming Soon
      </span>
    </div>
  )
}
