import { useCallback, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RunMeta } from '@/shared/lib/run-history-types'
import type {
  RunChainStep,
  RunResultItem,
  WorkflowRun,
} from '@/features/workflow/lib/run-store'
import type {
  CompareCandidate,
  PreviewSettings,
} from '@/features/preview/components'
import type { StudioNodeData } from '@/features/workflow/types'
import { useRunHistoryStore } from '@/features/workflow/store/run-history-store'
import {
  deleteRunFromHistory,
  deleteRunFiles,
  loadRunFiles,
  saveRunFile,
} from '@/shared/lib/image-opfs'
import { groupResults } from '@/features/workflow/lib/run-utils'
import { useSettingsStore } from '@/shared/stores/settings-store'
import {
  rerunSelectedGroups,
  type RerunProgress,
} from '@/features/workflow/lib/rerun-selected'
import type { RetryStatus } from '@/features/workflow/components/run-overview/retry-action-bar'

// Stable fallback — prevents useSyncExternalStore from seeing a new object every render
const EMPTY_META: Array<RunMeta> = []

interface EphemeralSettings {
  compareId: string | null
  viewMode: 'split' | 'overlay'
  sliderPos: number
}

const DEFAULT_EPHEMERAL: EphemeralSettings = {
  compareId: null,
  viewMode: 'split',
  sliderPos: 50,
}

function hydrateRun(
  meta: RunMeta,
  fileMap: Record<string, string>,
): WorkflowRun {
  return {
    id: meta.id,
    name: meta.name,
    workflowId: meta.workflowId,
    completedAt: meta.completedAt,
    durationMs: meta.durationMs,
    items: meta.items.map((item) => ({
      outputNodeId: item.outputNodeId,
      outputDataUrl: item.storedFile
        ? (fileMap[item.storedFile] ?? null)
        : null,
      inputFilename: item.inputFilename,
      inputNodeId: item.inputNodeId,
      chain: item.chain.map((step) => ({
        nodeId: step.nodeId,
        nodeData: step.nodeData,
        outputDataUrl: step.storedFile
          ? (fileMap[step.storedFile] ?? null)
          : null,
      })),
    })),
  }
}

export function useRunOverview(workflowId: string) {
  const qc = useQueryClient()
  const { previewPreferences, setPreviewPreferences } = useSettingsStore()

  // Core selection state — null means "auto-select first"
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [ephemeral, setEphemeral] = useState(DEFAULT_EPHEMERAL)
  const [showSettings, setShowSettings] = useState(false)

  // Retry state
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(
    new Set(),
  )
  const [retryStatus, setRetryStatus] = useState<RetryStatus>('idle')
  const [retryDraftSettings, setRetryDraftSettings] = useState<
    Map<string, StudioNodeData>
  >(new Map())
  const [retryOriginalSettings, setRetryOriginalSettings] = useState<
    Map<string, StudioNodeData>
  >(new Map())
  const [retryResults, setRetryResults] = useState<Array<RunResultItem> | null>(
    null,
  )
  const [retryProgress, setRetryProgress] = useState<RerunProgress | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const metaList = useRunHistoryStore(
    (s) => s.history[workflowId] ?? EMPTY_META,
  )
  const storeDeleteRun = useRunHistoryStore((s) => s.deleteRun)
  const storeRenameRun = useRunHistoryStore((s) => s.renameRun)
  const storeReplaceRunItems = useRunHistoryStore((s) => s.replaceRunItems)

  // Resolve selectedRunId: auto-select first if nothing selected
  const effectiveRunId = selectedRunId ?? metaList[0]?.id

  const { data: fileMap, isLoading: isHydrating } = useQuery({
    queryKey: ['run-files', workflowId, effectiveRunId],
    queryFn: () => {
      if (!effectiveRunId) return Promise.resolve({} as Record<string, string>)
      return loadRunFiles(workflowId, effectiveRunId)
    },
    enabled: !!effectiveRunId,
  })

  const selectedMeta = metaList.find((m) => m.id === effectiveRunId) ?? null

  const selectedRun: WorkflowRun | null = useMemo(() => {
    return selectedMeta && fileMap ? hydrateRun(selectedMeta, fileMap) : null
  }, [selectedMeta, fileMap])

  // Navigation derived state
  const resultGroups = useMemo(
    () => groupResults(selectedRun?.items ?? []),
    [selectedRun],
  )

  // When reviewing retry results, compute groups from retry results
  const retryResultGroups = useMemo(
    () => (retryResults ? groupResults(retryResults) : null),
    [retryResults],
  )

  const flatKeys = useMemo(() => {
    const source =
      retryStatus === 'reviewing' && retryResultGroups
        ? retryResultGroups
        : resultGroups
    const keys: Array<string> = []
    for (const group of source) {
      const groupKey = `${group.inputNodeId}|${group.inputFilename}`
      for (let idx = 0; idx < group.items.length; idx++) {
        keys.push(`${groupKey}|${idx}`)
      }
    }
    return keys
  }, [resultGroups, retryResultGroups, retryStatus])

  // Resolve selectedItemKey: auto-select first if nothing selected
  const effectiveItemKey = selectedItemKey ?? flatKeys[0]

  const selectedItem: RunResultItem | null = useMemo(() => {
    if (!effectiveItemKey) return null
    const source =
      retryStatus === 'reviewing' && retryResultGroups
        ? retryResultGroups
        : resultGroups
    const parts = effectiveItemKey.split('|')
    const groupKey = `${parts[0]}|${parts[1]}`
    const itemIdx = Number(parts[2])
    const group = source.find(
      (g) => `${g.inputNodeId}|${g.inputFilename}` === groupKey,
    )
    return group?.items[itemIdx] ?? null
  }, [effectiveItemKey, resultGroups, retryResultGroups, retryStatus])

  const currentFlatIndex = effectiveItemKey
    ? flatKeys.indexOf(effectiveItemKey)
    : -1

  // Resolve selectedStepId: auto-select last step if nothing selected
  const displayStep: RunChainStep | null = useMemo(() => {
    if (!selectedItem) return null
    if (selectedStepId) {
      return selectedItem.chain.find((s) => s.nodeId === selectedStepId) ?? null
    }
    return selectedItem.chain.at(-1) ?? null
  }, [selectedItem, selectedStepId])

  const compareCandidates = useMemo<Array<CompareCandidate>>(() => {
    if (!selectedItem || !displayStep) return []
    return selectedItem.chain
      .filter((s) => s.nodeId !== displayStep.nodeId && s.outputDataUrl != null)
      .map((s) => ({
        id: s.nodeId,
        label: s.nodeData.label,
        dataUrl: s.outputDataUrl!,
      }))
  }, [selectedItem, displayStep])

  const compareCandidate = compareCandidates.find(
    (c) => c.id === ephemeral.compareId,
  )

  const previewSettings: PreviewSettings = {
    ...previewPreferences,
    ...ephemeral,
  }

  // The merged chain used for retry settings panel — collects unique nodes
  // from ALL items in selected groups (handles fan-out where each result item
  // only has one branch of the graph in its chain).
  const retryChain = useMemo<Array<RunChainStep>>(() => {
    if (selectedGroupKeys.size === 0 || !selectedRun) return []
    const seen = new Set<string>()
    const merged: Array<RunChainStep> = []
    for (const group of resultGroups) {
      const gk = `${group.inputNodeId}|${group.inputFilename}`
      if (!selectedGroupKeys.has(gk)) continue
      for (const item of group.items) {
        for (const step of item.chain) {
          if (!seen.has(step.nodeId)) {
            seen.add(step.nodeId)
            merged.push(step)
          }
        }
      }
    }
    return merged
  }, [selectedGroupKeys, selectedRun, resultGroups])

  // Actions
  function selectRun(id: string) {
    setSelectedRunId(id)
    setSelectedItemKey(null)
    setSelectedStepId(null)
    setEphemeral(DEFAULT_EPHEMERAL)
    setShowSettings(false)
    // Clear retry state when switching runs
    exitRetryMode()
  }

  function selectItem(key: string) {
    setSelectedItemKey(key)
    setSelectedStepId(null)
    setEphemeral(DEFAULT_EPHEMERAL)
    setShowSettings(false)
  }

  function selectStep(nodeId: string) {
    setSelectedStepId(nodeId)
  }

  function navigateUp() {
    if (currentFlatIndex > 0) {
      const key = flatKeys[currentFlatIndex - 1]
      if (key) selectItem(key)
    }
  }

  function navigateDown() {
    if (currentFlatIndex < flatKeys.length - 1) {
      const key = flatKeys[currentFlatIndex + 1]
      if (key) selectItem(key)
    }
  }

  function updatePreviewSettings(patch: Partial<PreviewSettings>) {
    const { compareId, viewMode, sliderPos, ...persistable } = patch
    if (
      compareId !== undefined ||
      viewMode !== undefined ||
      sliderPos !== undefined
    ) {
      setEphemeral((s) => ({
        ...s,
        ...(compareId !== undefined && { compareId }),
        ...(viewMode !== undefined && { viewMode }),
        ...(sliderPos !== undefined && { sliderPos }),
      }))
    }
    if (Object.keys(persistable).length > 0) {
      setPreviewPreferences(persistable)
    }
  }

  const deleteRun = useMutation({
    mutationFn: (runId: string) => deleteRunFromHistory(workflowId, runId),
    onSuccess: (_data, runId) => {
      storeDeleteRun(workflowId, runId)
      qc.invalidateQueries({ queryKey: ['run-files', workflowId, runId] })
      if (effectiveRunId === runId) {
        const next = metaList.find((m) => m.id !== runId)
        selectRun(next?.id ?? '')
        if (!next) setSelectedRunId(null)
      }
    },
  })

  function renameRun(id: string, name: string) {
    storeRenameRun(workflowId, id, name)
  }

  // --- Retry actions ---

  function toggleGroupSelection(groupKey: string) {
    setSelectedGroupKeys((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  function clearGroupSelection() {
    setSelectedGroupKeys(new Set())
  }

  function enterRetryMode() {
    if (selectedGroupKeys.size === 0) return
    // Clone settings from ALL chains across all items in selected groups
    // to handle fan-out graphs where different items have different branches
    const draft = new Map<string, StudioNodeData>()
    const original = new Map<string, StudioNodeData>()
    for (const group of resultGroups) {
      const gk = `${group.inputNodeId}|${group.inputFilename}`
      if (!selectedGroupKeys.has(gk)) continue
      for (const item of group.items) {
        for (const step of item.chain) {
          if (!draft.has(step.nodeId)) {
            draft.set(step.nodeId, structuredClone(step.nodeData))
            original.set(step.nodeId, structuredClone(step.nodeData))
          }
        }
      }
    }
    setRetryDraftSettings(draft)
    setRetryOriginalSettings(original)
    setRetryStatus('configuring')
    setRetryResults(null)
    setRetryProgress(null)
    // Auto-select first item from selected groups
    const firstGroupFlatKey = flatKeys.find((k) => {
      const parts = k.split('|')
      const gk = `${parts[0]}|${parts[1]}`
      return selectedGroupKeys.has(gk)
    })
    if (firstGroupFlatKey) selectItem(firstGroupFlatKey)
  }

  function exitRetryMode() {
    // Revoke retry result blob URLs
    revokeRetryResults()
    setRetryStatus('idle')
    setRetryDraftSettings(new Map())
    setRetryOriginalSettings(new Map())
    setRetryResults(null)
    setRetryProgress(null)
    setSelectedGroupKeys(new Set())
    abortRef.current?.abort()
    abortRef.current = null
  }

  function revokeRetryResults() {
    if (retryResults) {
      for (const item of retryResults) {
        if (item.outputDataUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(item.outputDataUrl)
        }
        for (const step of item.chain) {
          if (step.outputDataUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(step.outputDataUrl)
          }
        }
      }
    }
  }

  function updateRetryNodeData(
    nodeId: string,
    patch: Partial<StudioNodeData>,
  ) {
    setRetryDraftSettings((prev) => {
      const next = new Map(prev)
      const current = next.get(nodeId)
      if (current) {
        next.set(nodeId, { ...current, ...patch } as StudioNodeData)
      }
      return next
    })
  }

  function resetRetryNodeData(nodeId: string) {
    setRetryDraftSettings((prev) => {
      const next = new Map(prev)
      const original = retryOriginalSettings.get(nodeId)
      if (original) {
        next.set(nodeId, structuredClone(original))
      }
      return next
    })
  }

  const executeRetry = useCallback(async () => {
    if (!selectedMeta || !fileMap || selectedGroupKeys.size === 0) return

    setRetryStatus('running')
    setRetryProgress({ current: 0, total: 0 })
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const results = await rerunSelectedGroups({
        selectedMeta,
        selectedGroupKeys,
        draftSettings: retryDraftSettings,
        fileMap,
        onProgress: (p) => setRetryProgress(p),
        abortSignal: controller.signal,
      })

      if (!controller.signal.aborted) {
        setRetryResults(results)
        setRetryStatus('reviewing')
        // Auto-select first retry result
        if (results.length > 0) {
          const firstResult = results[0]!
          const key = `${firstResult.inputNodeId}|${firstResult.inputFilename}|0`
          setSelectedItemKey(key)
          setSelectedStepId(null)
        }
      }
    } catch (err) {
      console.error('Retry execution failed:', err)
      setRetryStatus('configuring')
    } finally {
      setRetryProgress(null)
    }
  }, [selectedMeta, fileMap, selectedGroupKeys, retryDraftSettings])

  function retryAgain() {
    // Revoke current retry results and go back to configuring
    revokeRetryResults()
    setRetryResults(null)
    setRetryStatus('configuring')
  }

  const commitRetry = useCallback(async () => {
    if (!retryResults || !selectedMeta || !effectiveRunId) return

    try {
      // 1. Collect old storedFile references that will be replaced
      const oldStoredFiles: Array<string> = []
      for (const item of selectedMeta.items) {
        const key = `${item.inputNodeId}|${item.inputFilename}`
        if (!selectedGroupKeys.has(key)) continue
        if (item.storedFile) oldStoredFiles.push(item.storedFile)
        for (const step of item.chain) {
          if (step.storedFile) oldStoredFiles.push(step.storedFile)
        }
      }

      // 2. Save new result files to OPFS and build RunItem entries
      const newRunItems = await Promise.all(
        retryResults.map(async (result) => {
          // Save output file
          const storedFile = result.outputDataUrl
            ? await saveRunFile(
                workflowId,
                effectiveRunId,
                result.outputNodeId,
                result.inputFilename,
                result.outputDataUrl,
              )
            : null

          // Save chain step files
          const chainItems = await Promise.all(
            result.chain.map(async (step) => {
              const stepStoredFile = step.outputDataUrl
                ? await saveRunFile(
                    workflowId,
                    effectiveRunId,
                    step.nodeId,
                    result.inputFilename,
                    step.outputDataUrl,
                  )
                : null
              return {
                nodeId: step.nodeId,
                nodeData: step.nodeData,
                storedFile: stepStoredFile,
              }
            }),
          )

          return {
            outputNodeId: result.outputNodeId,
            storedFile,
            inputFilename: result.inputFilename,
            inputNodeId: result.inputNodeId,
            chain: chainItems,
          }
        }),
      )

      // 3. Delete old files from OPFS
      await deleteRunFiles(oldStoredFiles)

      // 4. Update the store
      storeReplaceRunItems(
        workflowId,
        effectiveRunId,
        selectedGroupKeys,
        newRunItems,
      )

      // 5. Invalidate query so the UI refreshes with new files
      qc.invalidateQueries({
        queryKey: ['run-files', workflowId, effectiveRunId],
      })

      // 6. Clean up retry state
      setRetryStatus('idle')
      setRetryDraftSettings(new Map())
      setRetryOriginalSettings(new Map())
      setRetryResults(null)
      setRetryProgress(null)
      setSelectedGroupKeys(new Set())
      abortRef.current = null
    } catch (err) {
      console.error('Failed to commit retry results:', err)
    }
  }, [
    retryResults,
    selectedMeta,
    effectiveRunId,
    workflowId,
    selectedGroupKeys,
    storeReplaceRunItems,
    qc,
  ])

  function discardRetry() {
    exitRetryMode()
  }

  return {
    // Run list
    metaList,
    isHydrating,
    selectedRunId: effectiveRunId ?? null,
    selectRun,
    selectedRun,
    deleteRun,
    renameRun,
    // Result item navigation
    resultGroups,
    flatKeys,
    currentFlatIndex,
    selectedItemKey: effectiveItemKey ?? null,
    selectedItem,
    selectItem,
    navigateUp,
    navigateDown,
    // Step selection
    selectedStepId,
    displayStep,
    selectStep,
    compareCandidates,
    // Preview settings
    previewSettings,
    compareDataUrl: compareCandidate?.dataUrl ?? null,
    compareLabel: compareCandidate?.label ?? null,
    updatePreviewSettings,
    showSettings,
    setShowSettings,
    // Retry
    selectedGroupKeys,
    toggleGroupSelection,
    clearGroupSelection,
    retryStatus,
    retryChain,
    retryDraftSettings,
    retryOriginalSettings,
    retryProgress,
    retryResults,
    enterRetryMode,
    exitRetryMode,
    updateRetryNodeData,
    resetRetryNodeData,
    executeRetry,
    commitRetry,
    discardRetry,
    retryAgain,
  }
}
