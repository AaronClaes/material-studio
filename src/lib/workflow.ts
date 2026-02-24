import type { Edge } from '@xyflow/react'
import type {
  AomapNodeData,
  ColorNodeData,
  CropNodeData,
  DisplacementNodeData,
  InputNodeData,
  NodeKind,
  NormalmapNodeData,
  OutputNodeData,
  QuiltingNodeData,
  ResolutionNodeData,
  StudioNode,
  StudioNodeData,
  WorkflowNodeData,
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
  normalmap: {
    label: 'Normal Map',
    icon: 'vector-triangle',
    description: 'Generate a normal map from a height map',
  },
  displacement: {
    label: 'Displacement',
    icon: 'arrows-move-vertical',
    description: 'Generate a displacement map from a height map',
  },
  aomap: {
    label: 'AO Map',
    icon: 'brightness-down',
    description: 'Generate an ambient occlusion map from a height map',
  },
  quilting: {
    label: 'Image Quilting',
    icon: 'texture',
    description: 'Synthesise a tileable texture from a sample image',
  },
  workflowNode: {
    label: 'Workflow',
    icon: 'copy',
    description: 'Run another workflow inside this one',
  },
  outputNode: {
    label: 'Output',
    icon: 'download',
    description: 'Export & save to disk',
  },
}

function nextId() {
  return `node-${crypto.randomUUID()}`
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
    case 'normalmap':
      return {
        kind: 'normalmap',
        label: 'Normal Map',
        strength: 1,
        level: 7,
        blurSharp: 0,
        filter: 'sobel',
        invertR: false,
        invertG: false,
        invertHeight: false,
        zRange: false,
        live: false,
      } satisfies NormalmapNodeData
    case 'displacement':
      return {
        kind: 'displacement',
        label: 'Displacement',
        contrast: 0,
        blurSharp: 0,
        invert: false,
        live: false,
      } satisfies DisplacementNodeData
    case 'aomap':
      return {
        kind: 'aomap',
        label: 'AO Map',
        strength: 1,
        mean: 0.5,
        range: 0.5,
        blurSharp: 0,
        invert: false,
        live: false,
      } satisfies AomapNodeData
    case 'quilting':
      return {
        kind: 'quilting',
        label: 'Image Quilting',
        outputWidth: 1024,
        outputHeight: 1024,
        patchSize: 64,
        overlapFraction: 0.1667,
        errorTolerance: 1.5,
        seed: 42,
      } satisfies QuiltingNodeData
    case 'workflowNode':
      return {
        kind: 'workflowNode',
        label: 'Workflow',
        workflowId: undefined,
        startNodeId: undefined,
        endNodeId: undefined,
      } satisfies WorkflowNodeData
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
    data: {
      kind: 'outputNode',
      label: 'Output',
      format: 'png',
      filename: 'output',
    },
  }

  return { nodes: [inputNode, outputNode], edges: [] }
}
