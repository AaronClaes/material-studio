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
import { NodeInspectorPanel } from './node-inspector-panel'
import { InputNode } from './nodes/input-node'
import { OutputNode } from './nodes/output-node'
import { CropNode } from './nodes/crop-node'
import { ResolutionNode } from './nodes/resolution-node'
import { ColorNode } from './nodes/color-node'
import type { Connection, NodeTypes } from '@xyflow/react'
import type { StudioEdge, StudioNode } from '@/types/studio'
import { createInitialGraph } from '@/lib/workflow'
import { useExecutionStore } from '@/lib/execution-store'

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

  const { run, isRunning } = useExecutionStore()
  const results = useExecutionStore((s) => s.results)

  const selectedNode = nodes.find((n) => n.selected) ?? null
  const selectedResult = selectedNode ? results[selectedNode.id] : undefined

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds)),
    [setEdges],
  )

  return (
    <div className="flex flex-col h-screen w-full">
      <StudioToolbar
        onAddNode={(node) => setNodes((ns) => [...ns, node])}
        onRunWorkflow={() => run(nodes, edges)}
        isRunning={isRunning}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
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
        {selectedNode && !selectedNode.data.disabled && (
          <NodeInspectorPanel node={selectedNode} result={selectedResult} />
        )}
      </div>
    </div>
  )
}
