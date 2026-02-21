'use client'

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useCallback } from 'react'
import { StudioToolbar } from './studio-toolbar'
import { InputNode } from './nodes/input-node'
import { OutputNode } from './nodes/output-node'
import { CropNode } from './nodes/crop-node'
import { ResolutionNode } from './nodes/resolution-node'
import { ColorNode } from './nodes/color-node'
import type { Connection, NodeTypes } from '@xyflow/react'
import type { StudioEdge, StudioNode } from '@/types/studio'
import { createInitialGraph } from '@/lib/workflow'

const nodeTypes: NodeTypes = {
  inputNode: InputNode as React.ComponentType<any>,
  outputNode: OutputNode as React.ComponentType<any>,
  crop: CropNode as React.ComponentType<any>,
  resolution: ResolutionNode as React.ComponentType<any>,
  color: ColorNode as React.ComponentType<any>,
}

const { nodes: initialNodes, edges: initialEdges } = createInitialGraph()

export function StudioCanvas() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<StudioNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<StudioEdge>(initialEdges)

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds)),
    [setEdges],
  )

  return (
    <div className="flex flex-col h-screen w-full">
      <StudioToolbar onAddNode={(node) => setNodes((ns) => [...ns, node])} />
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          fitView
          fitViewOptions={{ padding: 0.4 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  )
}
