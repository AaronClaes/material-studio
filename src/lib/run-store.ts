import { create } from 'zustand'
import type { StudioNodeData } from '@/types/studio'

export interface RunChainStep {
  nodeId: string
  nodeData: StudioNodeData
  outputDataUrl: string | null
}

export interface RunResultItem {
  outputNodeId: string
  outputDataUrl: string | null
  inputFilename: string
  inputNodeId: string
  chain: Array<RunChainStep>
}

export interface WorkflowRun {
  workflowId: string
  completedAt: number
  durationMs: number
  items: Array<RunResultItem>
}

interface RunStore {
  latestRuns: Record<string, WorkflowRun>
  unseenWorkflowIds: Array<string>
  saveRun: (run: WorkflowRun) => void
  clearRun: (workflowId: string) => void
  markSeen: (workflowId: string) => void
}

export const useRunStore = create<RunStore>((set) => ({
  latestRuns: {},
  unseenWorkflowIds: [],

  saveRun: (run) =>
    set((s) => ({
      latestRuns: { ...s.latestRuns, [run.workflowId]: run },
      unseenWorkflowIds: s.unseenWorkflowIds.includes(run.workflowId)
        ? s.unseenWorkflowIds
        : [...s.unseenWorkflowIds, run.workflowId],
    })),

  clearRun: (workflowId) =>
    set((s) => {
      const run = s.latestRuns[workflowId] as WorkflowRun | undefined

      if (run) {
        for (const item of run.items) {
          if (item.outputDataUrl?.startsWith('blob:'))
            URL.revokeObjectURL(item.outputDataUrl)
          for (const step of item.chain) {
            if (step.outputDataUrl?.startsWith('blob:'))
              URL.revokeObjectURL(step.outputDataUrl)
          }
        }
      }

      const { [workflowId]: _removed, ...rest } = s.latestRuns
      return {
        latestRuns: rest,
        unseenWorkflowIds: s.unseenWorkflowIds.filter(
          (id) => id !== workflowId,
        ),
      }
    }),

  markSeen: (workflowId) =>
    set((s) => ({
      unseenWorkflowIds: s.unseenWorkflowIds.filter((id) => id !== workflowId),
    })),
}))
