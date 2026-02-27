import { cn } from '@/shared/lib/utils'

export function PreviewOverlay({
  icon,
  label,
  detail,
  title,
  labelClassName = 'text-muted-foreground/60',
}: {
  icon?: React.ReactNode
  label: string
  detail?: string
  title?: string
  labelClassName?: string
}) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2"
      title={title}
    >
      {icon}
      <span className={cn('text-xs text-center', labelClassName)}>{label}</span>
      {detail && (
        <span className="text-xs text-destructive/70 text-center line-clamp-3 leading-tight">
          {detail}
        </span>
      )}
    </div>
  )
}
