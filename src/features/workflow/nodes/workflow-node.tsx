import { useEffect, useMemo } from 'react'
import { IconCopy } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioNode, WorkflowNodeData } from '@/features/workflow/types'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useActiveWorkflowActions,
  useActiveWorkflowIsRunning,
  useWorkflowStore,
} from '@/features/workflow/store/workflow-store'
import { useNodeConnection } from '@/features/workflow/hooks/use-node-connection'
import { useNodeUpdater } from '@/features/workflow/hooks/use-node-updater'
import { getDownstreamIds } from '@/features/workflow/lib/execution'

export function WorkflowNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'workflowNode') return null

  const workflows = useWorkflowStore((s) => s.workflows)
  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId)
  const isRunning = useActiveWorkflowIsRunning()
  const { runNode, runNodesFrom } = useActiveWorkflowActions()
  const { result, hasValidInput } = useNodeConnection(id)
  const { update, toggleDisabled } = useNodeUpdater<WorkflowNodeData>(id, {
    live: false,
    hasValidInput,
    isRunning,
  })

  const selectableWorkflows = workflows.filter((w) => w.id !== activeWorkflowId)
  const selectedWorkflow = selectableWorkflows.find(
    (w) => w.id === data.workflowId,
  )

  const startNodes = selectedWorkflow?.nodes ?? []

  const availableEndNodeIds = useMemo(() => {
    if (!selectedWorkflow || !data.startNodeId) return new Set<string>()
    return getDownstreamIds(data.startNodeId, selectedWorkflow.edges)
  }, [data.startNodeId, selectedWorkflow])

  const endNodes = useMemo(() => {
    if (!selectedWorkflow) return []
    return selectedWorkflow.nodes.filter((node) =>
      availableEndNodeIds.has(node.id),
    )
  }, [availableEndNodeIds, selectedWorkflow])

  useEffect(() => {
    if (data.workflowId && !selectedWorkflow) {
      update({
        workflowId: undefined,
        startNodeId: undefined,
        endNodeId: undefined,
      })
      return
    }

    if (!selectedWorkflow) return

    if (
      data.startNodeId &&
      !selectedWorkflow.nodes.some((node) => node.id === data.startNodeId)
    ) {
      update({ startNodeId: undefined, endNodeId: undefined })
      return
    }

    if (
      data.endNodeId &&
      (!data.startNodeId || !availableEndNodeIds.has(data.endNodeId))
    ) {
      update({ endNodeId: undefined })
    }
  }, [
    availableEndNodeIds,
    data.endNodeId,
    data.startNodeId,
    data.workflowId,
    selectedWorkflow,
    update,
  ])

  function formatNodeLabel(node: StudioNode): string {
    return `${node.data.label} (${node.id})`
  }

  function handleWorkflowChange(workflowId: string) {
    update({
      workflowId,
      startNodeId: undefined,
      endNodeId: undefined,
    })
  }

  function handleStartNodeChange(startNodeId: string) {
    const downstreamIds =
      selectedWorkflow && startNodeId
        ? getDownstreamIds(startNodeId, selectedWorkflow.edges)
        : new Set<string>()
    const currentEndNodeId =
      typeof data.endNodeId === 'string' ? data.endNodeId : undefined

    update({
      startNodeId,
      endNodeId: downstreamIds.has(currentEndNodeId ?? '')
        ? currentEndNodeId
        : startNodeId,
    })
  }

  const isConfigured =
    !!data.workflowId && !!data.startNodeId && !!data.endNodeId

  return (
    <BaseNode
      label={data.label}
      icon={<IconCopy size={14} />}
      selected={selected}
      nodeStatus={result?.status}
      resultPreview={result?.outputDataUrl}
      nodeError={result?.error}
      isRunning={isRunning}
      waitingLabel="Running nested workflow…"
      hasValidInput={hasValidInput && isConfigured}
      disabled={data.disabled}
      onToggleDisabled={() => toggleDisabled(data.disabled ?? false)}
      onRun={() => runNode(id)}
      onRunNodes={() => runNodesFrom(id)}
      nodeId={id}
    >
      <div className="space-y-2.5">
        <div className="space-y-1">
          <Label className="text-xs">Workflow</Label>
          <Select
            value={data.workflowId}
            onValueChange={handleWorkflowChange}
            disabled={selectableWorkflows.length === 0}
          >
            <SelectTrigger className="h-7 text-xs w-full">
              <SelectValue placeholder="Select workflow" />
            </SelectTrigger>
            <SelectContent>
              {selectableWorkflows.map((workflow) => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectableWorkflows.length === 0 && (
            <p className="text-[10px] text-muted-foreground">
              Create another workflow to use here.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Start Node</Label>
          <Select
            value={data.startNodeId}
            onValueChange={handleStartNodeChange}
            disabled={!selectedWorkflow || startNodes.length === 0}
          >
            <SelectTrigger className="h-7 text-xs w-full">
              <SelectValue placeholder="Select start node" />
            </SelectTrigger>
            <SelectContent>
              {startNodes.map((node) => (
                <SelectItem key={node.id} value={node.id}>
                  {formatNodeLabel(node)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">End Node</Label>
          <Select
            value={data.endNodeId}
            onValueChange={(endNodeId) => update({ endNodeId })}
            disabled={!data.startNodeId || endNodes.length === 0}
          >
            <SelectTrigger className="h-7 text-xs w-full">
              <SelectValue placeholder="Select end node" />
            </SelectTrigger>
            <SelectContent>
              {endNodes.map((node) => (
                <SelectItem key={node.id} value={node.id}>
                  {formatNodeLabel(node)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedWorkflow && data.startNodeId && endNodes.length === 0 && (
            <p className="text-[10px] text-muted-foreground">
              No nodes found after this start node.
            </p>
          )}
        </div>
      </div>
    </BaseNode>
  )
}
