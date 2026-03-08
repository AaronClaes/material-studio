import { updateWorkflow } from './workflow-crud'
import type { StoreGet, StoreSet, WorkflowDef } from './workflow-types'
import type { RunCallbacks } from '../lib/execution'

export function revokeOldUrl(url: string | null | undefined): void {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

export function makeCallbacks(set: StoreSet, workflowId: string): RunCallbacks {
  return {
    onNodeStart: (id) => {
      set((s) => {
        const wf = s.workflows.find((w) => w.id === workflowId)
        const existing = wf?.results[id]
        // Revoke all object URLs accumulated from the previous run
        for (const url of existing?.allOutputDataUrls ?? []) revokeOldUrl(url)
        if (!existing?.allOutputDataUrls?.length) revokeOldUrl(existing?.outputDataUrl)
        return {
          workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
            results: {
              ...w.results,
              [id]: {
                status: 'running',
                outputDataUrl: null,
                error: null,
                allOutputDataUrls: [],
              },
            },
          })),
        }
      })
    },
    onNodeDone: (id, dataUrl) => {
      set((s) => {
        const wf = s.workflows.find((w) => w.id === workflowId)
        // Only revoke the old preview URL when starting a fresh instance
        // sequence (allOutputDataUrls is empty = first instance of this run)
        const existing = wf?.results[id]
        if (!existing?.allOutputDataUrls?.length) {
          revokeOldUrl(existing?.outputDataUrl)
        }
        const prevUrls = existing?.allOutputDataUrls ?? []
        return {
          workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
            results: {
              ...w.results,
              [id]: {
                status: 'done',
                outputDataUrl: dataUrl,
                error: null,
                allOutputDataUrls: [...prevUrls, dataUrl],
              },
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
