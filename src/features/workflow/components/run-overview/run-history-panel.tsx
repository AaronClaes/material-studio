'use client'

import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconTrash } from '@tabler/icons-react'
import type { RunMeta } from '@/shared/lib/run-history-types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import { loadRunCoverUrl } from '@/shared/lib/image-opfs'
import { formatTimestamp } from '@/features/workflow/lib/run-utils'

interface RunHistoryPanelProps {
  metaList: Array<RunMeta>
  selectedRunId: string | null
  onSelectRun: (id: string) => void
  onDeleteRun: (id: string) => void
  onRenameRun: (id: string, name: string) => void
  isLoading: boolean
}

function RunCoverThumbnail({ storedFile }: { storedFile: string | null }) {
  const { data: url } = useQuery({
    queryKey: ['run-cover', storedFile],
    queryFn: () => loadRunCoverUrl(storedFile),
    enabled: !!storedFile,
  })

  if (url) {
    return (
      <img src={url} alt="" className="w-8 h-8 object-cover shrink-0 border" />
    )
  }
  return <div className="w-8 h-8 bg-muted shrink-0 border" />
}

function RunRow({
  meta,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  meta: RunMeta
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (name: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(meta.name)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setEditValue(meta.name)
    setIsEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== meta.name) {
      onRename(trimmed)
    }
    setIsEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setIsEditing(false)
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      onDoubleClick={startEdit}
      className={cn(
        'group flex items-center gap-1.5 w-full px-2 py-1.5 text-left transition-colors',
        isActive ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <RunCoverThumbnail storedFile={meta.items[0]?.storedFile ?? null} />
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-[10px] bg-transparent outline-none border-b border-primary"
          />
        ) : (
          <p className="text-[10px] truncate">{meta.name}</p>
        )}
        <p className="text-[9px] text-muted-foreground">
          {formatTimestamp(meta.completedAt)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        title="Delete run"
      >
        <IconTrash className="size-3" />
      </Button>
    </button>
  )
}

export function RunHistoryPanel({
  metaList,
  selectedRunId,
  onSelectRun,
  onDeleteRun,
  onRenameRun,
  isLoading,
}: RunHistoryPanelProps) {
  return (
    <div className="w-56 border-r shrink-0 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b flex items-center gap-2 shrink-0">
        <span className="text-xs font-semibold">History</span>
        {metaList.length > 0 && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5">
            {metaList.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-2 space-y-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1.5">
                <Skeleton className="w-8 h-8 shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-2.5 w-full" />
                  <Skeleton className="h-2 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : metaList.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center p-4">
            No runs yet.
          </p>
        ) : (
          metaList.map((meta) => (
            <RunRow
              key={meta.id}
              meta={meta}
              isActive={selectedRunId === meta.id}
              onSelect={() => onSelectRun(meta.id)}
              onDelete={() => onDeleteRun(meta.id)}
              onRename={(name) => onRenameRun(meta.id, name)}
            />
          ))
        )}
      </div>
    </div>
  )
}
