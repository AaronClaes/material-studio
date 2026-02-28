import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import type { ResultGroup } from '@/features/workflow/lib/run-utils'
import type { StudioNode } from '@/features/workflow/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface ResultItemSidebarProps {
  resultGroups: Array<ResultGroup>
  selectedItemKey: string | null
  onSelectItem: (key: string) => void
  currentFlatIndex: number
  flatKeysLength: number
  onNavigateUp: () => void
  onNavigateDown: () => void
  nodes: Array<StudioNode>
}

export function ResultItemSidebar({
  resultGroups,
  selectedItemKey,
  onSelectItem,
  currentFlatIndex,
  flatKeysLength,
  onNavigateUp,
  onNavigateDown,
  nodes,
}: ResultItemSidebarProps) {
  const nodeLabel = (nodeId: string): string => {
    const n = nodes.find((x) => x.id === nodeId)
    return n?.data.label ?? nodeId
  }

  return (
    <div className="w-52 border-r shrink-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-center border-b p-1 gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={currentFlatIndex <= 0}
          onClick={onNavigateUp}
        >
          <IconChevronUp className="size-3.5" />
        </Button>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {currentFlatIndex + 1} / {flatKeysLength}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={currentFlatIndex >= flatKeysLength - 1}
          onClick={onNavigateDown}
        >
          <IconChevronDown className="size-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {resultGroups.map((group) => {
          const groupKey = `${group.inputNodeId}|${group.inputFilename}`
          const groupLabel =
            group.inputFilename || nodeLabel(group.inputNodeId) || 'Input'
          return (
            <div key={groupKey} className="mb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-1 truncate">
                {groupLabel}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item, idx) => {
                  const itemKey = `${groupKey}|${idx}`
                  const isActive = selectedItemKey === itemKey
                  return (
                    <button
                      key={itemKey}
                      type="button"
                      onClick={() => onSelectItem(itemKey)}
                      className={cn(
                        'flex items-center gap-1.5 w-full px-1 py-1 text-left transition-colors',
                        isActive ? 'bg-accent' : 'hover:bg-accent/50',
                      )}
                    >
                      {item.outputDataUrl ? (
                        <img
                          src={item.outputDataUrl}
                          alt={nodeLabel(item.outputNodeId)}
                          className="w-8 h-8 object-cover shrink-0 border"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-muted shrink-0 border" />
                      )}
                      <span className="text-[10px] truncate">
                        {nodeLabel(item.outputNodeId)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
