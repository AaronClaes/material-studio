import { createInitialGraph } from '../lib/workflow'
import type { StudioEdge, StudioNode } from '@/features/workflow/types'
import type { StoreGet, StoreSet, WorkflowDef } from './workflow-types'
import {
  deleteAllWorkflowInputs,
  deleteAllWorkflowRunFiles,
  deleteWorkflowResults,
} from '@/shared/lib/image-opfs'
import { useRunHistoryStore } from './run-history-store'
import { useDirectoryStore } from '@/shared/stores/directory-store'

export let _workflowCounter = 1

export function createWorkflow(name?: string): WorkflowDef {
  const { nodes, edges } = createInitialGraph()
  return {
    id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name ?? `Workflow ${_workflowCounter++}`,
    nodes,
    edges,
    results: {},
    isRunning: false,
  }
}

export function updateWorkflow(
  workflows: Array<WorkflowDef>,
  id: string,
  updater: (w: WorkflowDef) => Partial<WorkflowDef>,
): Array<WorkflowDef> {
  return workflows.map((w) => (w.id === id ? { ...w, ...updater(w) } : w))
}

export function exportWorkflow(wf: WorkflowDef): void {
  const payload = {
    name: wf.name,
    nodes: wf.nodes.map((n) =>
      n.data.kind === 'inputNode' || n.data.kind === 'googleDriveInputNode'
        ? { ...n, data: { ...n.data, src: '', processedCount: 0 } }
        : n,
    ),
    edges: wf.edges,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${wf.name.replace(/\s+/g, '-').toLowerCase()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function buildCrudActions(set: StoreSet, get: StoreGet) {
  return {
    addWorkflow: () => {
      const existing = get().workflows
      _workflowCounter = existing.length + 1
      const w = createWorkflow(`Workflow ${existing.length + 1}`)
      set((s) => ({
        workflows: [...s.workflows, w],
        activeWorkflowId: w.id,
      }))
    },

    duplicateWorkflow: (id: string) => {
      const wf = get().workflows.find((w) => w.id === id)
      if (!wf) return
      const copy: WorkflowDef = {
        id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: `${wf.name} copy`,
        nodes: wf.nodes.map((n) =>
          n.data.kind === 'inputNode' || n.data.kind === 'googleDriveInputNode'
            ? { ...n, data: { ...n.data, src: '', processedCount: 0 } }
            : n,
        ),
        edges: wf.edges,
        results: {},
        isRunning: false,
      }
      set((s) => ({
        workflows: [...s.workflows, copy],
        activeWorkflowId: copy.id,
      }))
    },

    deleteWorkflow: (id: string) => {
      const { workflows, activeWorkflowId } = get()
      if (workflows.length <= 1) return

      const deletedWorkflow = workflows.find((w) => w.id === id)
      const remaining = workflows.filter((w) => w.id !== id)
      const nextActive =
        activeWorkflowId === id
          ? (remaining[remaining.length - 1]?.id ??
            remaining[0]?.id ??
            activeWorkflowId)
          : activeWorkflowId

      // Repair broken workflowNode references in remaining workflows
      const repairedRemaining = remaining.map((w) => ({
        ...w,
        nodes: w.nodes.map((n) =>
          n.type === 'workflowNode' && n.data.kind === 'workflowNode' && n.data.workflowId === id
            ? { ...n, data: { ...n.data, workflowId: undefined } }
            : n,
        ),
      }))

      set({ workflows: repairedRemaining, activeWorkflowId: nextActive })

      // Async cleanup (fire-and-forget)
      void Promise.all([
        deleteAllWorkflowInputs(id),
        deleteWorkflowResults(id),
        deleteAllWorkflowRunFiles(id),
      ])
      useRunHistoryStore.getState().deleteWorkflowHistory(id)
      if (deletedWorkflow) {
        const { clearHandle } = useDirectoryStore.getState()
        for (const node of deletedWorkflow.nodes) {
          clearHandle(node.id)
        }
      }
    },

    setActiveWorkflowId: (id: string) => set({ activeWorkflowId: id }),

    renameWorkflow: (id: string, name: string) => {
      set((s) => ({
        workflows: updateWorkflow(s.workflows, id, () => ({ name })),
      }))
    },

    importWorkflow: (def: {
      name: string
      nodes: Array<StudioNode>
      edges: Array<StudioEdge>
    }) => {
      const w: WorkflowDef = {
        id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: def.name,
        nodes: def.nodes,
        edges: def.edges,
        results: {},
        isRunning: false,
      }
      set((s) => ({
        workflows: [...s.workflows, w],
        activeWorkflowId: w.id,
      }))
    },
  }
}
