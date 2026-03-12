'use client'

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useCallback, useEffect, useState } from 'react'
import {
  AomapNode,
  ColorNode,
  CropNode,
  DisplacementNode,
  GoogleDriveInputNode,
  InputNode,
  NormalmapNode,
  OutputNode,
  QuiltingNode,
  ResolutionNode,
  WorkflowNode,
} from '../nodes'
import { useDirectoryRestore } from '../hooks/use-directory-restore'
import { useRestoreWorkflowResults } from '../hooks/use-restore-workflow-results'
import { StudioToolbar } from './studio-toolbar'
import { FloatingAddNode } from './floating-add-node'
import { WorkflowPanel } from './workflow-panel'
import { WorkflowHistoryDialog } from './run-overview/workflow-history-dialog'
import type {
  Connection,
  EdgeChange,
  NodeChange,
  NodeTypes,
} from '@xyflow/react'
import {
  exportWorkflow,
  useWorkflowStore,
} from '@/features/workflow/store/workflow-store'
import { createNode } from '@/features/workflow/lib/workflow'
import { saveWorkflowInput } from '@/shared/lib/image-opfs'
import { useDirectoryStore } from '@/shared/stores/directory-store'
import { useRunHistoryStore } from '@/features/workflow/store/run-history-store'

const nodeTypes: NodeTypes = {
  inputNode: InputNode,
  googleDriveInputNode: GoogleDriveInputNode,
  outputNode: OutputNode,
  crop: CropNode,
  resolution: ResolutionNode,
  color: ColorNode,
  normalmap: NormalmapNode,
  displacement: DisplacementNode,
  aomap: AomapNode,
  quilting: QuiltingNode,
  workflowNode: WorkflowNode,
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
  const patchNodeData = useWorkflowStore((s) => s.patchNodeData)
  const run = useWorkflowStore((s) => s.run)
  const duplicateWorkflow = useWorkflowStore((s) => s.duplicateWorkflow)
  const renameWorkflow = useWorkflowStore((s) => s.renameWorkflow)
  const workflows = useWorkflowStore((s) => s.workflows)

  const directoryHandles = useDirectoryStore((s) => s.handles)

  const hasUnseenRun = useRunHistoryStore((s) =>
    s.unseenWorkflowIds.includes(activeWorkflowId),
  )
  const markSeen = useRunHistoryStore((s) => s.markSeen)
  const hasHistory = useRunHistoryStore(
    (s) => (s.history[activeWorkflowId] ?? []).length > 0,
  )
  const [overviewOpen, setOverviewOpen] = useState(false)

  useDirectoryRestore()
  useRestoreWorkflowResults(activeWorkflowId)

  useEffect(() => {
    if (hasUnseenRun) {
      setOverviewOpen(true)
      markSeen(activeWorkflowId)
    }
  }, [activeWorkflowId, hasUnseenRun, markSeen])

  const nodes = activeWorkflow?.nodes ?? []
  const edges = activeWorkflow?.edges ?? []
  const isRunning = activeWorkflow?.isRunning ?? false

  const canRun = nodes.some(
    (n) =>
      (n.data.kind === 'inputNode' &&
        (n.data.batch ? !!directoryHandles[n.id] : !!n.data.src)) ||
      (n.data.kind === 'googleDriveInputNode' &&
        (n.data.batch ? !!n.data.folderId : !!n.data.src)),
  )

  const [isDragging, setIsDragging] = useState(false)

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file?.type.startsWith('image/')) return
    const node = createNode('inputNode', { x: 240, y: 160 })
    addNode(activeWorkflowId, node)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const src = ev.target?.result
      if (typeof src !== 'string') return
      const blob = await fetch(src).then((r) => r.blob())
      await saveWorkflowInput(activeWorkflowId, node.id, blob)
      patchNodeData(activeWorkflowId, node.id, { src, srcFilename: file.name })
    }
    reader.readAsDataURL(file)
  }

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
    <div className="flex h-full w-full">
      <WorkflowPanel />

      <div className="flex flex-col h-full w-full">
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
          canDeleteWorkflow={workflows.length > 1}
          hasHistory={hasHistory}
          onViewHistory={() => setOverviewOpen(true)}
        />
        <WorkflowHistoryDialog
          open={overviewOpen}
          onOpenChange={setOverviewOpen}
          workflowId={activeWorkflowId}
          nodes={activeWorkflow?.nodes ?? []}
        />
        <div className="flex flex-1 overflow-hidden">
          <div
            className="flex-1 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
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
            {isDragging && (
              <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-primary bg-primary/10" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
