import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RunMeta } from '@/shared/lib/run-history-types'

interface RunHistoryStore {
  history: Record<string, Array<RunMeta>>
  unseenWorkflowIds: Array<string>

  saveRun: (meta: RunMeta) => void
  deleteRun: (workflowId: string, runId: string) => void
  deleteWorkflowHistory: (workflowId: string) => void
  renameRun: (workflowId: string, runId: string, name: string) => void
  markSeen: (workflowId: string) => void
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
    }),
    { name: 'material-studio-run-history' },
  ),
)
