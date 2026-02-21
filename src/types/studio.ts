import type { Edge, Node } from '@xyflow/react'

export type NodeKind =
  | 'inputNode'
  | 'crop'
  | 'resolution'
  | 'color'
  | 'outputNode'

export interface InputNodeData {
  kind: 'inputNode'
  label: string
  src: string
}

export interface CropNodeData {
  kind: 'crop'
  label: string
  x: number
  y: number
  width: number
  height: number
}

export interface ResolutionNodeData {
  kind: 'resolution'
  label: string
  width: number
  height: number
  maintainAspect: boolean
}

export interface ColorNodeData {
  kind: 'color'
  label: string
  brightness: number
  contrast: number
  saturation: number
  hue: number
}

export interface OutputNodeData {
  kind: 'outputNode'
  label: string
  format: 'png' | 'jpg' | 'webp'
}

export type StudioNodeData = (
  | InputNodeData
  | CropNodeData
  | ResolutionNodeData
  | ColorNodeData
  | OutputNodeData
) & Record<string, unknown>

export type StudioNode = Node<StudioNodeData, NodeKind>
export type StudioEdge = Edge
