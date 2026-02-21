'use client'

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useCallback } from 'react'
import { StudioToolbar } from './studio-toolbar'
import { NodeInspectorPanel } from './node-inspector-panel'
import { WorkflowPanel } from './workflow-panel'
import { InputNode } from './nodes/input-node'
import { OutputNode } from './nodes/output-node'
import { CropNode } from './nodes/crop-node'
import { ResolutionNode } from './nodes/resolution-node'
import { ColorNode } from './nodes/color-node'
import type { Connection, EdgeChange, NodeChange, NodeTypes } from '@xyflow/react'
import { useActiveWorkflowResults, useWorkflowStore } from '@/lib/workflow-store'

const nodeTypes: NodeTypes = {
  inputNode: InputNode as React.ComponentType<any>,
  outputNode: OutputNode as React.ComponentType<any>,
  crop: CropNode as React.ComponentType<any>,
  resolution: ResolutionNode as React.ComponentType<any>,
  color: ColorNode as React.ComponentType<any>,
}

export function StudioCanvas() {
  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId)
  const activeWorkflow = useWorkflowStore((s) =>
    s.workflows.find((w) => w.id === s.activeWorkflowId),
  )
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange)
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange)
  const onConnect = useWorkflowStore((s) => s.onConnect)
  const addNode = useWorkflowStore((s) => s.addNode)
  const run = useWorkflowStore((s) => s.run)

  const results = useActiveWorkflowResults()

  const nodes = activeWorkflow?.nodes ?? []
  const edges = activeWorkflow?.edges ?? []
  const isRunning = activeWorkflow?.isRunning ?? false

  const selectedNode = nodes.find((n) => n.selected) ?? null
  const selectedResult = selectedNode ? results[selectedNode.id] : undefined

  const handleNodesChange = useCallback(
    (changes: Array<NodeChange>) => onNodesChange(activeWorkflowId, changes),
    [activeWorkflowId, onNodesChange],
  )

  const handleEdgesChange = useCallback(
    (changes: Array<EdgeChange>) => onEdgesChange(activeWorkflowId, changes),
    [activeWorkflowId, onEdgesChange],
  )

  const handleConnect = useCallback(
    (connection: Connection) => onConnect(activeWorkflowId, connection),
    [activeWorkflowId, onConnect],
  )

  return (
    <div className="flex flex-col h-screen w-full">
      <StudioToolbar
        workflowName={activeWorkflow?.name ?? ''}
        onAddNode={(node) => addNode(activeWorkflowId, node)}
        onRunWorkflow={() => run(activeWorkflowId)}
        isRunning={isRunning}
      />
      <div className="flex flex-1 overflow-hidden">
        <WorkflowPanel />
        <div className="flex-1 relative">
          <ReactFlow
            key={activeWorkflowId}
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
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
