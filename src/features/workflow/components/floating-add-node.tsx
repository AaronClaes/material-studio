import {
  IconArrowsMoveVertical,
  IconBrandGoogleDrive,
  IconBrightnessDown,
  IconCopy,
  IconCrop,
  IconDownload,
  IconMaximize,
  IconPalette,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconTexture,
  IconVectorTriangle,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import type { NodeKind, StudioNode } from '@/features/workflow/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { NODE_META, createNode } from '@/features/workflow/lib/workflow'

const NODES: Array<{
  kind: NodeKind
  icon: ComponentType<{ size?: number | string; className?: string }>
  tags: Array<string>
}> = [
  { kind: 'inputNode', icon: IconPhoto, tags: ['source', 'image', 'import'] },
  {
    kind: 'googleDriveInputNode',
    icon: IconBrandGoogleDrive,
    tags: ['google', 'drive', 'cloud', 'import'],
  },
  { kind: 'crop', icon: IconCrop, tags: ['trim', 'bounds', 'cut'] },
  { kind: 'resolution', icon: IconMaximize, tags: ['resize', 'scale'] },
  { kind: 'color', icon: IconPalette, tags: ['hue', 'contrast', 'saturation'] },
  {
    kind: 'normalmap',
    icon: IconVectorTriangle,
    tags: ['normal', 'height', 'bump'],
  },
  {
    kind: 'displacement',
    icon: IconArrowsMoveVertical,
    tags: ['height', 'depth', 'displace'],
  },
  {
    kind: 'aomap',
    icon: IconBrightnessDown,
    tags: ['ambient', 'occlusion', 'ao'],
  },
  { kind: 'workflowNode', icon: IconCopy, tags: ['nested', 'subgraph'] },
  { kind: 'outputNode', icon: IconDownload, tags: ['export', 'save'] },
  {
    kind: 'googleDriveOutputNode',
    icon: IconBrandGoogleDrive,
    tags: ['google', 'drive', 'cloud', 'export', 'save'],
  },
  {
    kind: 'quilting',
    icon: IconTexture,
    tags: ['texture', 'synthesis', 'tile', 'quilting', 'sample'],
  },
  {
    kind: 'nanoBanana',
    icon: IconSparkles,
    tags: ['ai', 'gemini', 'generate', 'nano', 'banana'],
  },
]

const NODE_GROUPS: Array<{ label: string; kinds: Array<NodeKind> }> = [
  { label: 'Flow', kinds: ['inputNode', 'googleDriveInputNode', 'workflowNode', 'outputNode', 'googleDriveOutputNode'] },
  { label: 'Adjust', kinds: ['crop', 'resolution', 'color'] },
  { label: 'Generate Maps', kinds: ['normalmap', 'displacement', 'aomap'] },
  { label: 'Synthesise', kinds: ['quilting'] },
  { label: 'AI / Generate', kinds: ['nanoBanana'] },
]

interface FloatingAddNodeProps {
  onAddNode: (node: StudioNode) => void
}

export function FloatingAddNode({ onAddNode }: FloatingAddNodeProps) {
  const [query, setQuery] = useState('')

  const queryValue = query.trim().toLowerCase()
  const filteredNodes = useMemo(
    () =>
      NODES.filter(({ kind, tags }) => {
        if (!queryValue) return true
        const meta = NODE_META[kind]
        return [meta.label, meta.description, ...tags].some((field) =>
          field.toLowerCase().includes(queryValue),
        )
      }),
    [queryValue],
  )

  const filteredKinds = useMemo(
    () => new Set(filteredNodes.map((node) => node.kind)),
    [filteredNodes],
  )

  const visibleGroups = useMemo(
    () =>
      NODE_GROUPS.map((group) => ({
        ...group,
        kinds: group.kinds.filter((kind) => filteredKinds.has(kind)),
      })).filter((group) => group.kinds.length > 0),
    [filteredKinds],
  )

  function handleAdd(kind: NodeKind) {
    const node = createNode(kind, { x: 240, y: 160 })
    onAddNode(node)
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setQuery('')
    }
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <DropdownMenu onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="gap-2 shadow-lg pointer-events-auto"
          >
            <IconPlus size={15} />
            Add Node
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="center"
          className="w-96 mb-1 p-1.5"
        >
          <div className="px-1.5 py-1.5">
            <div className="relative">
              <IconSearch
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a node..."
                className="h-8 pl-7 pr-2 text-xs"
                onKeyDown={(event) => event.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          {visibleGroups.map((group, index) => {
            return (
              <div key={group.label}>
                <DropdownMenuLabel className="px-2.5 py-1.5">
                  {group.label}
                </DropdownMenuLabel>
                {group.kinds.map((kind) => {
                  const descriptor = NODES.find((node) => node.kind === kind)
                  if (!descriptor) return null
                  const Icon = descriptor.icon
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
                {index < visibleGroups.length - 1 && <DropdownMenuSeparator />}
              </div>
            )
          })}
          {filteredNodes.length === 0 && (
            <div className="px-2.5 py-5 text-center text-xs text-muted-foreground">
              No nodes match &quot;{query}&quot;
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
