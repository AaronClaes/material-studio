import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import type { ResultGroup } from '@/features/workflow/lib/run-utils'
import type { StudioNode } from '@/features/workflow/types'
import type { RetryStatus } from './retry-action-bar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  // Retry selection
  selectedGroupKeys: Set<string>
  onToggleGroup: (groupKey: string) => void
  onClearSelection: () => void
  onEnterRetryMode: () => void
  retryStatus: RetryStatus
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
  selectedGroupKeys,
  onToggleGroup,
  onClearSelection,
  onEnterRetryMode,
  retryStatus,
}: ResultItemSidebarProps) {
  const nodeLabel = (nodeId: string): string => {
    const n = nodes.find((x) => x.id === nodeId)
    return n?.data.label ?? nodeId
  }

  const isInRetryMode = retryStatus !== 'idle'

  // In retry mode, only show selected groups
  const displayGroups = isInRetryMode
    ? resultGroups.filter((group) => {
        const groupKey = `${group.inputNodeId}|${group.inputFilename}`
        return selectedGroupKeys.has(groupKey)
      })
    : resultGroups

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
        {displayGroups.map((group) => {
          const groupKey = `${group.inputNodeId}|${group.inputFilename}`
          const groupLabel =
            group.inputFilename || nodeLabel(group.inputNodeId) || 'Input'
          const isGroupSelected = selectedGroupKeys.has(groupKey)

          return (
            <div key={groupKey} className="mb-3">
              <div className="flex items-center gap-1.5 px-1 pb-1">
                {!isInRetryMode && (
                  <Checkbox
                    checked={isGroupSelected}
                    onCheckedChange={() => onToggleGroup(groupKey)}
                    className="size-3"
                  />
                )}
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  {groupLabel}
                </p>
              </div>
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

      {/* Selection footer — visible when groups are selected and not in retry mode */}
      {selectedGroupKeys.size > 0 && !isInRetryMode && (
        <div className="border-t p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {selectedGroupKeys.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] px-1.5"
              onClick={onClearSelection}
            >
              Clear
            </Button>
          </div>
          <Button
            size="sm"
            className="w-full h-7 text-xs"
            onClick={onEnterRetryMode}
          >
            Retry selected
          </Button>
        </div>
      )}
    </div>
  )
}
