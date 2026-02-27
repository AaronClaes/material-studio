import type { RunResultItem } from '@/features/workflow/lib/run-store'

export interface ResultGroup {
  inputFilename: string
  inputNodeId: string
  items: Array<RunResultItem>
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = Math.round((ms % 60_000) / 1000)
  return `${mins}m ${secs}s`
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function groupResults(items: Array<RunResultItem>): Array<ResultGroup> {
  const map = new Map<string, ResultGroup>()
  for (const item of items) {
    const key = `${item.inputNodeId}|${item.inputFilename}`
    if (!map.has(key)) {
      map.set(key, {
        inputFilename: item.inputFilename,
        inputNodeId: item.inputNodeId,
        items: [],
      })
    }
    map.get(key)!.items.push(item)
  }
  return [...map.values()]
}
