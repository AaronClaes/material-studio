import type { Edge } from '@xyflow/react'
import type {
  ColorNodeData,
  CropNodeData,
  InputNodeData,
  NodeKind,
  OutputNodeData,
  ResolutionNodeData,
  StudioNode,
  StudioNodeData,
} from '@/types/studio'

export const NODE_META: Record<
  NodeKind,
  { label: string; icon: string; description: string }
> = {
  inputNode: {
    label: 'Input',
    icon: 'photo',
    description: 'Load an image file',
  },
  crop: {
    label: 'Crop',
    icon: 'crop',
    description: 'Trim to a region',
  },
  resolution: {
    label: 'Resolution',
    icon: 'maximize',
    description: 'Scale & resize',
  },
  color: {
    label: 'Color',
    icon: 'palette',
    description: 'Brightness, contrast & hue',
  },
  outputNode: {
    label: 'Output',
    icon: 'download',
    description: 'Export & save to disk',
  },
}

let _idCounter = 100

function nextId() {
  return `node-${++_idCounter}`
}

function defaultData(kind: NodeKind): StudioNodeData {
  switch (kind) {
    case 'inputNode':
      return {
        kind: 'inputNode',
        label: 'Input',
        src: '',
      } satisfies InputNodeData
    case 'crop':
      return {
        kind: 'crop',
        label: 'Crop',
        x: 0,
        y: 0,
        width: 512,
        height: 512,
      } satisfies CropNodeData
    case 'resolution':
      return {
        kind: 'resolution',
        label: 'Resolution',
        width: 1024,
        height: 1024,
        maintainAspect: true,
      } satisfies ResolutionNodeData
    case 'color':
      return {
        kind: 'color',
        label: 'Color',
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        tintColor: '#ffffff',
        live: false,
      } satisfies ColorNodeData
    case 'outputNode':
      return {
        kind: 'outputNode',
        label: 'Output',
        format: 'png',
        filename: 'output',
      } satisfies OutputNodeData
  }
}

export function createNode(
  kind: NodeKind,
  position: { x: number; y: number },
): StudioNode {
  return {
    id: nextId(),
    type: kind,
    position,
    data: defaultData(kind),
  }
}

export function createInitialGraph(): {
  nodes: Array<StudioNode>
  edges: Array<Edge>
} {
  const inputNode: StudioNode = {
    id: 'node-1',
    type: 'inputNode',
    position: { x: 80, y: 160 },
    data: { kind: 'inputNode', label: 'Input', src: '' },
  }

  const outputNode: StudioNode = {
    id: 'node-2',
    type: 'outputNode',
    position: { x: 420, y: 160 },
    data: { kind: 'outputNode', label: 'Output', format: 'png', filename: 'output' },
  }

  const edge: Edge = {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    type: 'smoothstep',
  }

  return { nodes: [inputNode, outputNode], edges: [edge] }
}
