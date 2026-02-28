import { useCallback, useMemo, useState } from 'react'
import { groupResults } from './run-utils'
import type { ResultGroup } from './run-utils'
import type {
  RunResultItem,
  WorkflowRun,
} from '@/features/workflow/lib/run-store'

export function useRunNavigation(run: WorkflowRun | null) {
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const items = run?.items ?? []

  const groups = useMemo<Array<ResultGroup>>(() => groupResults(items), [items])

  const flatKeys = useMemo(() => {
    const keys: Array<string> = []
    for (const group of groups) {
      const groupKey = `${group.inputNodeId}|${group.inputFilename}`
      for (let idx = 0; idx < group.items.length; idx++) {
        keys.push(`${groupKey}|${idx}`)
      }
    }
    return keys
  }, [groups])

  const activeItem = useMemo<RunResultItem | null>(() => {
    if (!activeKey) return groups[0]?.items[0] ?? null
    const parts = activeKey.split('|')
    const groupKey = `${parts[0]}|${parts[1]}`
    const itemIdx = Number(parts[2])
    const group = groups.find(
      (g) => `${g.inputNodeId}|${g.inputFilename}` === groupKey,
    )
    return group?.items[itemIdx] ?? null
  }, [activeKey, groups])

  const currentFlatIndex = useMemo(() => {
    const effectiveKey = activeKey ?? flatKeys[0]
    if (!effectiveKey) return -1
    return flatKeys.indexOf(effectiveKey)
  }, [activeKey, flatKeys])

  const navigateUp = useCallback(() => {
    if (currentFlatIndex > 0) setActiveKey(flatKeys[currentFlatIndex - 1])
  }, [currentFlatIndex, flatKeys])

  const navigateDown = useCallback(() => {
    if (currentFlatIndex < flatKeys.length - 1)
      setActiveKey(flatKeys[currentFlatIndex + 1])
  }, [currentFlatIndex, flatKeys])

  const reset = useCallback(() => {
    setActiveKey(null)
  }, [])

  return {
    activeKey,
    setActiveKey,
    groups,
    flatKeys,
    activeItem,
    currentFlatIndex,
    navigateUp,
    navigateDown,
    reset,
  }
}
