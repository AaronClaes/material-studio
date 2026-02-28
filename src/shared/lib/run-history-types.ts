import type { StudioNodeData } from '@/features/workflow/types'

export interface RunStep {
  nodeId: string
  nodeData: StudioNodeData
  storedFile: string | null
}

export interface RunItem {
  outputNodeId: string
  storedFile: string | null
  inputFilename: string
  inputNodeId: string
  chain: Array<RunStep>
}

export interface RunMeta {
  id: string
  name: string
  workflowId: string
  completedAt: number
  durationMs: number
  items: Array<RunItem>
}

export type RunHistory = Array<RunMeta>
