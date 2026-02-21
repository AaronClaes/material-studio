import { IconPlus } from '@tabler/icons-react'
import type { NodeKind, StudioNode } from '@/types/studio'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NODE_META, createNode } from '@/lib/workflow'

const NODE_KINDS: Array<NodeKind> = [
  'inputNode',
  'crop',
  'resolution',
  'color',
  'outputNode',
]

interface StudioToolbarProps {
  onAddNode: (node: StudioNode) => void
}

export function StudioToolbar({ onAddNode }: StudioToolbarProps) {
  function handleAdd(kind: NodeKind) {
    const node = createNode(kind, { x: 240, y: 160 })
    onAddNode(node)
  }

  return (
    <div className="flex items-center justify-between border-b px-4 py-2 bg-card">
      <span className="text-sm font-semibold tracking-tight">
        Material Studio
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5">
            <IconPlus size={14} />
            Add Node
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {NODE_KINDS.map((kind) => (
            <DropdownMenuItem key={kind} onSelect={() => handleAdd(kind)}>
              <span className="capitalize">{NODE_META[kind].label}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {NODE_META[kind].description}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
