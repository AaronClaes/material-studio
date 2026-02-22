'use client'

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useCallback, useEffect } from 'react'
import { StudioToolbar } from './studio-toolbar'
import { FloatingAddNode } from './floating-add-node'
import { WorkflowPanel } from './workflow-panel'
import {
  AomapNode,
  ColorNode,
  CropNode,
  DisplacementNode,
  InputNode,
  NormalmapNode,
  OutputNode,
  ResolutionNode,
} from './nodes'
import type {
  Connection,
  EdgeChange,
  NodeChange,
  NodeTypes,
} from '@xyflow/react'
import {
  exportWorkflow,
  useWorkflowStore,
} from '@/lib/workflow-store'
import { readDirectoryPreview, useDirectoryStore } from '@/lib/directory-store'

const nodeTypes: NodeTypes = {
  inputNode: InputNode,
  outputNode: OutputNode,
  crop: CropNode,
  resolution: ResolutionNode,
  color: ColorNode,
  normalmap: NormalmapNode,
  displacement: DisplacementNode,
  aomap: AomapNode,
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
  const deleteWorkflow = useWorkflowStore((s) => s.deleteWorkflow)
  const duplicateWorkflow = useWorkflowStore((s) => s.duplicateWorkflow)
  const renameWorkflow = useWorkflowStore((s) => s.renameWorkflow)
  const workflows = useWorkflowStore((s) => s.workflows)

  const directoryHandles = useDirectoryStore((s) => s.handles)
  const restoreHandles = useDirectoryStore((s) => s.restoreHandles)

  const patchNodeData = useWorkflowStore((s) => s.patchNodeData)

  useEffect(() => {
    const allNodes = workflows.flatMap((w) => w.nodes)
    const dirNodeIds = allNodes
      .filter(
        (n) =>
          (n.data.kind === 'inputNode' && n.data.batch) ||
          n.data.kind === 'outputNode',
      )
      .map((n) => n.id)
    if (dirNodeIds.length === 0) return

    const nodeById = Object.fromEntries(allNodes.map((n) => [n.id, n]))
    const workflowByNode = Object.fromEntries(
      workflows.flatMap((w) => w.nodes.map((n) => [n.id, w.id])),
    )

    restoreHandles(dirNodeIds, (nodeId) =>
      nodeById[nodeId].data.kind === 'outputNode' ? 'readwrite' : 'read',
    ).then(() => {
      const handles = useDirectoryStore.getState().handles
      for (const nodeId of dirNodeIds) {
        const node = nodeById[nodeId]
        if (node.data.kind !== 'inputNode') continue
        const handle = handles[nodeId]
        if (!handle) continue
        readDirectoryPreview(handle).then((preview) => {
          patchNodeData(workflowByNode[nodeId], nodeId, {
            ...preview,
            processedCount: 0,
          })
        })
      }
    })
    // Only restore once on mount
  }, [])

  const nodes = activeWorkflow?.nodes ?? []
  const edges = activeWorkflow?.edges ?? []
  const isRunning = activeWorkflow?.isRunning ?? false

  const canRun = nodes.some(
    (n) =>
      n.data.kind === 'inputNode' &&
      (n.data.batch ? !!directoryHandles[n.id] : !!n.data.src),
  )

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
        workflowId={activeWorkflowId}
        workflowName={activeWorkflow?.name ?? ''}
        onRenameWorkflow={renameWorkflow}
        onRunWorkflow={() => run(activeWorkflowId)}
        isRunning={isRunning}
        canRun={canRun}
        onExportWorkflow={() =>
          activeWorkflow && exportWorkflow(activeWorkflow)
        }
        onDuplicateWorkflow={() => duplicateWorkflow(activeWorkflowId)}
        onDeleteWorkflow={() => deleteWorkflow(activeWorkflowId)}
        canDeleteWorkflow={workflows.length > 1}
      />
      <div className="flex flex-1 overflow-hidden">
        <WorkflowPanel />
        <div className="flex-1 relative">
          <FloatingAddNode
            onAddNode={(node) => addNode(activeWorkflowId, node)}
          />
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
            minZoom={0.1}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}
