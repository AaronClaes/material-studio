import { useMemo, useState } from 'react'
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
import { useRunHistoryStore } from '@/features/workflow/store/run-history-store'
import { deleteRunFromHistory, loadRunFiles } from '@/shared/lib/image-opfs'
import { groupResults } from '@/features/workflow/lib/run-utils'
import { useSettingsStore } from '@/shared/stores/settings-store'

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
      outputDataUrl: item.storedFile ? (fileMap[item.storedFile] ?? null) : null,
      inputFilename: item.inputFilename,
      inputNodeId: item.inputNodeId,
      chain: item.chain.map((step) => ({
        nodeId: step.nodeId,
        nodeData: step.nodeData,
        outputDataUrl: step.storedFile ? (fileMap[step.storedFile] ?? null) : null,
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

  const metaList = useRunHistoryStore((s) => s.history[workflowId] ?? [])
  const storeDeleteRun = useRunHistoryStore((s) => s.deleteRun)
  const storeRenameRun = useRunHistoryStore((s) => s.renameRun)

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

  const flatKeys = useMemo(() => {
    const keys: Array<string> = []
    for (const group of resultGroups) {
      const groupKey = `${group.inputNodeId}|${group.inputFilename}`
      for (let idx = 0; idx < group.items.length; idx++) {
        keys.push(`${groupKey}|${idx}`)
      }
    }
    return keys
  }, [resultGroups])

  // Resolve selectedItemKey: auto-select first if nothing selected
  const effectiveItemKey = selectedItemKey ?? flatKeys[0]

  const selectedItem: RunResultItem | null = useMemo(() => {
    if (!effectiveItemKey) return null
    const parts = effectiveItemKey.split('|')
    const groupKey = `${parts[0]}|${parts[1]}`
    const itemIdx = Number(parts[2])
    const group = resultGroups.find(
      (g) => `${g.inputNodeId}|${g.inputFilename}` === groupKey,
    )
    return group?.items[itemIdx] ?? null
  }, [effectiveItemKey, resultGroups])

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

  // Actions
  function selectRun(id: string) {
    setSelectedRunId(id)
    setSelectedItemKey(null)
    setSelectedStepId(null)
    setEphemeral(DEFAULT_EPHEMERAL)
    setShowSettings(false)
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
  }
}
