import type { Edge, Node } from '@xyflow/react'

export interface GPUImageBuffer {
  buffer: GPUBuffer // packed RGBA u32 storage buffer
  width: number
  height: number
}

export type NodeKind =
  | 'inputNode'
  | 'crop'
  | 'resolution'
  | 'color'
  | 'normalmap'
  | 'displacement'
  | 'aomap'
  | 'workflowNode'
  | 'outputNode'

export interface InputNodeData {
  kind: 'inputNode'
  label: string
  src: string
  srcFilename?: string
  batch?: boolean
  folderName?: string
  fileCount?: number
  processedCount?: number
}

export interface CropNodeData {
  kind: 'crop'
  label: string
  x: number
  y: number
  width: number
  height: number
  disabled?: boolean
}

export interface ResolutionNodeData {
  kind: 'resolution'
  label: string
  width: number
  height: number
  maintainAspect: boolean
  disabled?: boolean
}

export interface ColorNodeData {
  kind: 'color'
  label: string
  brightness: number
  contrast: number
  saturation: number
  hue: number
  tintColor: string
  live?: boolean
  disabled?: boolean
}

export interface NormalmapNodeData {
  kind: 'normalmap'
  label: string
  strength: number
  level: number
  blurSharp: number
  filter: 'sobel' | 'scharr'
  invertR: boolean
  invertG: boolean
  invertHeight: boolean
  zRange: boolean
  live?: boolean
  disabled?: boolean
}

export interface DisplacementNodeData {
  kind: 'displacement'
  label: string
  contrast: number
  blurSharp: number
  invert: boolean
  live?: boolean
  disabled?: boolean
}

export interface AomapNodeData {
  kind: 'aomap'
  label: string
  strength: number
  mean: number
  range: number
  blurSharp: number
  invert: boolean
  live?: boolean
  disabled?: boolean
}

export interface OutputNodeData {
  kind: 'outputNode'
  label: string
  format: 'png' | 'jpg' | 'webp'
  filename: string
  disabled?: boolean
}

export interface WorkflowNodeData {
  kind: 'workflowNode'
  label: string
  workflowId?: string
  startNodeId?: string
  endNodeId?: string
  disabled?: boolean
}

export type StudioNodeData = (
  | InputNodeData
  | CropNodeData
  | ResolutionNodeData
  | ColorNodeData
  | NormalmapNodeData
  | DisplacementNodeData
  | AomapNodeData
  | WorkflowNodeData
  | OutputNodeData
) &
  Record<string, unknown>

export type StudioNode = Node<StudioNodeData, NodeKind>
export type StudioEdge = Edge

export type NodeStatus = 'idle' | 'running' | 'done' | 'error' | 'skipped'
export interface NodeResult {
  status: NodeStatus
  outputDataUrl: string | null
  error: string | null
}
export type ExecutionResults = Record<string, NodeResult | undefined>
