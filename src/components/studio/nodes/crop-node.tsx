import { useEdges, useReactFlow } from '@xyflow/react'
import { IconCrop } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioEdge, StudioNode } from '@/types/studio'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useExecutionStore } from '@/lib/execution-store'

export function CropNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'crop') return null

  const { setNodes, getNodes, getEdges, updateNodeData } = useReactFlow()
  const edges = useEdges()
  const result = useExecutionStore((s) => s.results[id])
  const isRunning = useExecutionStore((s) => s.isRunning)
  const runNode = useExecutionStore((s) => s.runNode)
  const runNodesFrom = useExecutionStore((s) => s.runNodesFrom)

  const upstreamId = edges.find((e) => e.target === id)?.source
  const upstreamResult = useExecutionStore((s) => s.results[upstreamId ?? ''])
  const hasValidInput =
    upstreamResult?.status === 'done' || upstreamResult?.status === 'skipped'

  function update(patch: Partial<typeof data>) {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    )
  }

  function toggleDisabled() {
    updateNodeData(id, { disabled: !data.disabled })
  }

  return (
    <BaseNode
      label={data.label}
      icon={<IconCrop size={14} />}
      selected={selected}
      nodeStatus={result?.status}
      resultPreview={result?.outputDataUrl}
      nodeError={result?.error}
      isRunning={isRunning}
      hasValidInput={hasValidInput}
      disabled={data.disabled}
      onToggleDisabled={toggleDisabled}
      onRun={() =>
        runNode(
          id,
          getNodes() as Array<StudioNode>,
          getEdges() as Array<StudioEdge>,
        )
      }
      onRunNodes={() =>
        runNodesFrom(
          id,
          getNodes() as Array<StudioNode>,
          getEdges() as Array<StudioEdge>,
        )
      }
    >
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        {(
          [
            ['x', 'X', data.x],
            ['y', 'Y', data.y],
            ['width', 'W', data.width],
            ['height', 'H', data.height],
          ] as const
        ).map(([key, lbl, val]) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{lbl}</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={val}
              onChange={(e) => update({ [key]: Number(e.target.value) })}
            />
          </div>
        ))}
      </div>
    </BaseNode>
  )
}
