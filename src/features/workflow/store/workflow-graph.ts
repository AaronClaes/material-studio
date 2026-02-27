import { addEdge, applyEdgeChanges, applyNodeChanges } from '@xyflow/react'
import { updateWorkflow } from './workflow-crud'
import type { Connection, EdgeChange, NodeChange } from '@xyflow/react'
import type { StudioEdge, StudioNode } from '@/features/workflow/types'
import type { StoreGet, StoreSet } from './workflow-types'

export function buildGraphActions(set: StoreSet, _get: StoreGet) {
  return {
    onNodesChange: (workflowId: string, changes: Array<NodeChange>) => {
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          nodes: applyNodeChanges(changes, w.nodes) as Array<StudioNode>,
        })),
      }))
    },

    onEdgesChange: (workflowId: string, changes: Array<EdgeChange>) => {
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          edges: applyEdgeChanges(changes, w.edges) as Array<StudioEdge>,
        })),
      }))
    },

    addNode: (workflowId: string, node: StudioNode) => {
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          nodes: [...w.nodes, node],
        })),
      }))
    },

    onConnect: (workflowId: string, connection: Connection) => {
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          edges: addEdge({ ...connection, type: 'smoothstep' }, w.edges),
        })),
      }))
    },

    patchNodeData: (
      workflowId: string,
      nodeId: string,
      patch: Record<string, unknown>,
    ) => {
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          nodes: w.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
          ),
        })),
      }))
    },
  }
}
