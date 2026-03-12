import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  buildCrudActions,
  createWorkflow,
  exportWorkflow,
} from './workflow-crud'
import { buildGraphActions } from './workflow-graph'
import { buildExecutionActions } from './workflow-execution'
import type { ExecutionResults } from '@/features/workflow/types'
import type { WorkflowStore } from './workflow-types'

export type { WorkflowDef } from './workflow-types'
export { exportWorkflow }

const initialWorkflow = createWorkflow('Workflow 1')

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
      workflows: [initialWorkflow],
      activeWorkflowId: initialWorkflow.id,
      ...buildCrudActions(set, get),
      ...buildGraphActions(set, get),
      ...buildExecutionActions(set, get),
    }),
    {
      name: 'material-studio-workflows',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        activeWorkflowId: s.activeWorkflowId,
        workflows: s.workflows.map((w) => ({
          id: w.id,
          name: w.name,
          nodes: w.nodes.map((n) =>
            n.data.kind === 'inputNode' ||
            n.data.kind === 'googleDriveInputNode'
              ? { ...n, data: { ...n.data, src: '', processedCount: 0 } }
              : n,
          ),
          edges: w.edges,
          results: {},
          isRunning: false,
        })),
      }),
    },
  ),
)

// Stable fallback — prevents useSyncExternalStore from seeing a new object every render
const EMPTY_RESULTS: ExecutionResults = {}

// Convenience selectors
export const useActiveWorkflow = () =>
  useWorkflowStore((s) => s.workflows.find((w) => w.id === s.activeWorkflowId))

export const useActiveWorkflowResults = () =>
  useWorkflowStore(
    (s) =>
      s.workflows.find((w) => w.id === s.activeWorkflowId)?.results ??
      EMPTY_RESULTS,
  )

export const useActiveWorkflowIsRunning = () =>
  useWorkflowStore(
    (s) =>
      s.workflows.find((w) => w.id === s.activeWorkflowId)?.isRunning ?? false,
  )

// Stable module-level object — reads activeWorkflowId from getState() at call time
// so the hook never returns a new object reference (which would cause an infinite loop).
const _activeWorkflowActions = {
  run: () => {
    const s = useWorkflowStore.getState()
    return s.run(s.activeWorkflowId)
  },
  runNode: (nodeId: string) => {
    const s = useWorkflowStore.getState()
    return s.runNode(s.activeWorkflowId, nodeId)
  },
  runNodesFrom: (nodeId: string) => {
    const s = useWorkflowStore.getState()
    return s.runNodesFrom(s.activeWorkflowId, nodeId)
  },
  runBatch: (nodeId: string) => {
    const s = useWorkflowStore.getState()
    return s.runBatch(s.activeWorkflowId, nodeId)
  },
  reset: () => {
    const s = useWorkflowStore.getState()
    return s.resetWorkflow(s.activeWorkflowId)
  },
}

export const useActiveWorkflowActions = () => _activeWorkflowActions
