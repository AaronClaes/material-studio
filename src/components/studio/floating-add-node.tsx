import {
  IconCrop,
  IconDownload,
  IconMaximize,
  IconPalette,
  IconPhoto,
  IconPlus,
  IconVectorTriangle,
} from '@tabler/icons-react'
import type { ElementType } from 'react'
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
  'normalmap',
  'outputNode',
]

const NODE_ICONS: Record<NodeKind, ElementType> = {
  inputNode: IconPhoto,
  crop: IconCrop,
  resolution: IconMaximize,
  color: IconPalette,
  normalmap: IconVectorTriangle,
  outputNode: IconDownload,
}

interface FloatingAddNodeProps {
  onAddNode: (node: StudioNode) => void
}

export function FloatingAddNode({ onAddNode }: FloatingAddNodeProps) {
  function handleAdd(kind: NodeKind) {
    const node = createNode(kind, { x: 240, y: 160 })
    onAddNode(node)
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 shadow-lg bg-card/90 backdrop-blur-sm border-border/70 pointer-events-auto"
          >
            <IconPlus size={15} />
            Add Node
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="center"
          className="w-72 mb-1 p-1.5"
        >
          {NODE_KINDS.map((kind) => {
            const Icon = NODE_ICONS[kind]
            const meta = NODE_META[kind]
            return (
              <DropdownMenuItem
                key={kind}
                onSelect={() => handleAdd(kind)}
                className="gap-3 px-2 py-2 cursor-pointer"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-muted text-muted-foreground">
                  <Icon size={14} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium leading-none">
                    {meta.label}
                  </span>
                  <span className="text-xs text-muted-foreground leading-snug truncate">
                    {meta.description}
                  </span>
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
