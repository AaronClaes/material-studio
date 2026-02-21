import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface BaseNodeProps {
  label: string
  icon: React.ReactNode
  selected?: boolean
  hasInput?: boolean
  hasOutput?: boolean
  children?: React.ReactNode
}

export function BaseNode({
  label,
  icon,
  selected,
  hasInput = true,
  hasOutput = true,
  children,
}: BaseNodeProps) {
  return (
    <Card
      className={cn(
        'w-[220px] rounded-none shadow-md',
        selected && 'ring-2 ring-primary',
      )}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-2.5! h-2.5! rounded-full border-2 border-primary bg-background!"
        />
      )}
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 px-3 py-2">
        <span className="text-muted-foreground">{icon}</span>
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      {children && (
        <CardContent className="px-3 pb-3 pt-0">{children}</CardContent>
      )}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-2.5! h-2.5! rounded-full! border-2! border-primary! bg-background!"
        />
      )}
    </Card>
  )
}
