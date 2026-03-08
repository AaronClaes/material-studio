import type { Connection, EdgeChange, NodeChange } from '@xyflow/react'
import type {
  ExecutionResults,
  StudioEdge,
  StudioNode,
} from '@/features/workflow/types'

export interface WorkflowDef {
  id: string
  name: string
  nodes: Array<StudioNode>
  edges: Array<StudioEdge>
  results: ExecutionResults
  isRunning: boolean
}

export interface WorkflowStore {
  workflows: Array<WorkflowDef>
  activeWorkflowId: string

  // Workflow management
  addWorkflow: () => void
  deleteWorkflow: (id: string) => void
  duplicateWorkflow: (id: string) => void
  setActiveWorkflowId: (id: string) => void
  renameWorkflow: (id: string, name: string) => void
  importWorkflow: (def: {
    name: string
    nodes: Array<StudioNode>
    edges: Array<StudioEdge>
  }) => void

  // Graph mutations
  onNodesChange: (workflowId: string, changes: Array<NodeChange>) => void
  onEdgesChange: (workflowId: string, changes: Array<EdgeChange>) => void
  addNode: (workflowId: string, node: StudioNode) => void
  onConnect: (workflowId: string, connection: Connection) => void
  patchNodeData: (
    workflowId: string,
    nodeId: string,
    patch: Record<string, unknown>,
  ) => void

  // Execution
  setResults: (workflowId: string, results: ExecutionResults) => void
  run: (workflowId: string) => Promise<void>
  runNode: (workflowId: string, nodeId: string) => Promise<void>
  runNodesFrom: (workflowId: string, nodeId: string) => Promise<void>
  runBatch: (workflowId: string, nodeId: string) => Promise<void>
  resetWorkflow: (workflowId: string) => void
}

export type StoreSet = (
  partial:
    | WorkflowStore
    | Partial<WorkflowStore>
    | ((state: WorkflowStore) => WorkflowStore | Partial<WorkflowStore>),
) => void

export type StoreGet = () => WorkflowStore
