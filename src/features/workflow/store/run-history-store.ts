import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RunMeta, RunItem } from '@/shared/lib/run-history-types'

interface RunHistoryStore {
  history: Record<string, Array<RunMeta>>
  unseenWorkflowIds: Array<string>

  saveRun: (meta: RunMeta) => void
  deleteRun: (workflowId: string, runId: string) => void
  deleteWorkflowHistory: (workflowId: string) => void
  renameRun: (workflowId: string, runId: string, name: string) => void
  markSeen: (workflowId: string) => void
  replaceRunItems: (
    workflowId: string,
    runId: string,
    groupKeys: Set<string>,
    newItems: Array<RunItem>,
  ) => void
}

export const useRunHistoryStore = create<RunHistoryStore>()(
  persist(
    (set) => ({
      history: {},
      unseenWorkflowIds: [],

      saveRun: (meta) =>
        set((s) => ({
          history: {
            ...s.history,
            [meta.workflowId]: [meta, ...(s.history[meta.workflowId] ?? [])],
          },
          unseenWorkflowIds: s.unseenWorkflowIds.includes(meta.workflowId)
            ? s.unseenWorkflowIds
            : [...s.unseenWorkflowIds, meta.workflowId],
        })),

      deleteRun: (workflowId, runId) =>
        set((s) => ({
          history: {
            ...s.history,
            [workflowId]: (s.history[workflowId] ?? []).filter(
              (r) => r.id !== runId,
            ),
          },
        })),

      deleteWorkflowHistory: (workflowId) =>
        set((s) => {
          const { [workflowId]: _removed, ...history } = s.history
          return {
            history,
            unseenWorkflowIds: s.unseenWorkflowIds.filter((id) => id !== workflowId),
          }
        }),

      renameRun: (workflowId, runId, name) =>
        set((s) => ({
          history: {
            ...s.history,
            [workflowId]: (s.history[workflowId] ?? []).map((r) =>
              r.id === runId ? { ...r, name } : r,
            ),
          },
        })),

      markSeen: (workflowId) =>
        set((s) => ({
          unseenWorkflowIds: s.unseenWorkflowIds.filter(
            (id) => id !== workflowId,
          ),
        })),

      replaceRunItems: (workflowId, runId, groupKeys, newItems) =>
        set((s) => ({
          history: {
            ...s.history,
            [workflowId]: (s.history[workflowId] ?? []).map((r) => {
              if (r.id !== runId) return r
              // Remove old items matching the group keys, insert new ones in their place
              const kept = r.items.filter((item) => {
                const key = `${item.inputNodeId}|${item.inputFilename}`
                return !groupKeys.has(key)
              })
              return {
                ...r,
                items: [...kept, ...newItems],
                completedAt: Date.now(),
              }
            }),
          },
        })),
    }),
    { name: 'material-studio-run-history' },
  ),
)
