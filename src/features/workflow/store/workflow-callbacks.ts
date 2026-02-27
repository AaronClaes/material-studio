import { updateWorkflow } from './workflow-crud'
import type { StoreGet, StoreSet, WorkflowDef } from './workflow-types'
import type { RunCallbacks } from '../lib/execution'

export function revokeOldUrl(url: string | null | undefined): void {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

export function makeCallbacks(set: StoreSet, workflowId: string): RunCallbacks {
  return {
    onNodeStart: (id) => {
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          results: {
            ...w.results,
            [id]: { status: 'running', outputDataUrl: null, error: null },
          },
        })),
      }))
    },
    onNodeDone: (id, dataUrl) => {
      set((s) => {
        const wf = s.workflows.find((w) => w.id === workflowId)
        revokeOldUrl(wf?.results[id]?.outputDataUrl)
        return {
          workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
            results: {
              ...w.results,
              [id]: { status: 'done', outputDataUrl: dataUrl, error: null },
            },
          })),
        }
      })
    },
    onNodeError: (id, error) => {
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          results: {
            ...w.results,
            [id]: { status: 'error', outputDataUrl: null, error },
          },
        })),
      }))
    },
    onNodeSkipped: (id, dataUrl) => {
      set((s) => {
        const wf = s.workflows.find((w) => w.id === workflowId)
        revokeOldUrl(wf?.results[id]?.outputDataUrl)
        return {
          workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
            results: {
              ...w.results,
              [id]: { status: 'skipped', outputDataUrl: dataUrl, error: null },
            },
          })),
        }
      })
    },
  }
}

export function getWorkflow(
  get: StoreGet,
  workflowId: string,
): WorkflowDef | undefined {
  return get().workflows.find((w) => w.id === workflowId)
}

export function makeRunOptions(get: StoreGet, workflowId: string) {
  return {
    currentWorkflowId: workflowId,
    callStack: [workflowId],
    workflowResolver: (targetWorkflowId: string) => {
      const workflow = get().workflows.find((w) => w.id === targetWorkflowId)
      if (!workflow) return undefined
      return { nodes: workflow.nodes, edges: workflow.edges }
    },
  }
}
