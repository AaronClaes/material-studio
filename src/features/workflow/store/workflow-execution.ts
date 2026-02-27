import { getDownstreamIds, runFromNode, runSingleNode } from '../lib/execution'
import { dataUrlToGPUBuffer, processInputNode } from '@/shared/gpu/processors'
import { getGPUDevice } from '@/shared/gpu'
import { useDirectoryStore } from '@/shared/stores/directory-store'
import { updateWorkflow } from './workflow-crud'
import { useRunStore } from '../lib/run-store'
import { notify } from '@/shared/stores/settings-store'
import { makeCallbacks, makeRunOptions, getWorkflow, revokeOldUrl } from './workflow-callbacks'
import { saveOutputNodes, buildRunItems } from './workflow-output-saver'
import { runBatchCollect } from './workflow-batch'
import type { StoreGet, StoreSet } from './workflow-types'
import type { RunResultItem } from '../lib/run-store'

export function buildExecutionActions(set: StoreSet, get: StoreGet) {
  return {
    run: async (workflowId: string) => {
      const wf = getWorkflow(get, workflowId)
      if (!wf || wf.isRunning) return

      const startTime = Date.now()
      useRunStore.getState().clearRun(workflowId)

      const { nodes, edges } = wf

      const batchNodeIds = nodes
        .filter((n) => n.data.kind === 'inputNode' && n.data.batch)
        .map((n) => n.id)
        .filter((id) => useDirectoryStore.getState().handles[id])

      const allBatchItems: Array<RunResultItem> = []
      for (const nodeId of batchNodeIds) {
        const items = await runBatchCollect(set, get, workflowId, nodeId)
        allBatchItems.push(...items)
      }

      const regularInputs = nodes.filter(
        (n) => n.data.kind === 'inputNode' && !n.data.batch && n.data.src,
      )
      if (regularInputs.length === 0) {
        if (allBatchItems.length > 0) {
          useRunStore.getState().saveRun({
            workflowId,
            completedAt: Date.now(),
            durationMs: Date.now() - startTime,
            items: allBatchItems,
          })
          const wfName = getWorkflow(get, workflowId)?.name ?? 'Workflow'
          notify(`${wfName} complete`, {
            body: `${allBatchItems.length} output(s) processed`,
          })
        }
        return
      }

      const affectedIds = new Set<string>()
      for (const inputNode of regularInputs) {
        for (const id of getDownstreamIds(inputNode.id, edges)) {
          affectedIds.add(id)
        }
      }

      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => {
          const results = { ...w.results }
          for (const id of affectedIds) {
            revokeOldUrl(results[id]?.outputDataUrl)
            results[id] = { status: 'idle', outputDataUrl: null, error: null }
          }
          return { isRunning: true, results }
        }),
      }))

      const callbacks = makeCallbacks(set, workflowId)
      const runOptions = makeRunOptions(get, workflowId)
      for (const inputNode of regularInputs) {
        await runFromNode(
          inputNode.id,
          undefined,
          nodes,
          edges,
          callbacks,
          runOptions,
        )
        const downstreamIds = getDownstreamIds(inputNode.id, edges)
        const afterWf = getWorkflow(get, workflowId)
        if (afterWf) {
          const stem =
            inputNode.data.kind === 'inputNode'
              ? (inputNode.data.srcFilename ?? '')
              : undefined
          await saveOutputNodes(
            afterWf.nodes,
            afterWf.edges,
            afterWf.results,
            downstreamIds,
            stem,
          )
        }
      }

      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, () => ({
          isRunning: false,
        })),
      }))

      const finalWf = getWorkflow(get, workflowId)
      if (finalWf) {
        const regularItems = buildRunItems(
          finalWf.nodes,
          finalWf.edges,
          finalWf.results,
        ).map((item) => ({
          ...item,
          inputFilename:
            (item.chain[0]?.nodeData as { srcFilename?: string }).srcFilename ??
            '',
          inputNodeId: item.chain[0]?.nodeId ?? '',
        }))
        const items = [...allBatchItems, ...regularItems]
        if (items.length > 0) {
          useRunStore.getState().saveRun({
            workflowId,
            completedAt: Date.now(),
            durationMs: Date.now() - startTime,
            items,
          })
          const wfName = getWorkflow(get, workflowId)?.name ?? 'Workflow'
          notify(`${wfName} complete`, {
            body: `${items.length} output(s) processed`,
          })
        }
      }
    },

    runNode: async (workflowId: string, nodeId: string) => {
      const wf = getWorkflow(get, workflowId)
      if (!wf || wf.isRunning) return

      const { nodes, edges } = wf
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return
      if (node.data.kind !== 'inputNode' && node.data.disabled) return

      const device = await getGPUDevice()

      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          results: {
            ...w.results,
            [nodeId]: { status: 'running', outputDataUrl: null, error: null },
          },
        })),
      }))

      if (node.data.kind === 'inputNode') {
        if (!node.data.src) return
        const input = await processInputNode(device, node.data.src)
        await runSingleNode(
          nodeId,
          input,
          nodes,
          makeCallbacks(set, workflowId),
          makeRunOptions(get, workflowId),
        )
        input.buffer.destroy()
      } else {
        const incomingEdge = edges.find((e) => e.target === nodeId)
        const upstreamId = incomingEdge?.source
        if (!upstreamId) return
        const upstreamResult = wf.results[upstreamId]
        if (!upstreamResult?.outputDataUrl) return

        const input = await dataUrlToGPUBuffer(
          device,
          upstreamResult.outputDataUrl,
        )
        await runSingleNode(
          nodeId,
          input,
          nodes,
          makeCallbacks(set, workflowId),
          makeRunOptions(get, workflowId),
        )
        input.buffer.destroy()
      }

      const afterWf = getWorkflow(get, workflowId)
      if (afterWf)
        await saveOutputNodes(
          afterWf.nodes,
          afterWf.edges,
          afterWf.results,
          new Set([nodeId]),
        )
    },

    runNodesFrom: async (workflowId: string, nodeId: string) => {
      const wf = getWorkflow(get, workflowId)
      if (!wf || wf.isRunning) return

      const { nodes, edges } = wf
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return

      const callbacks = makeCallbacks(set, workflowId)

      if (node.data.kind === 'inputNode') {
        if (!node.data.src) return
        const downstreamIds = getDownstreamIds(nodeId, edges)
        set((s) => ({
          workflows: updateWorkflow(s.workflows, workflowId, (w) => {
            const results = { ...w.results }
            for (const id of downstreamIds) {
              revokeOldUrl(results[id]?.outputDataUrl)
              results[id] = { status: 'idle', outputDataUrl: null, error: null }
            }
            return { isRunning: true, results }
          }),
        }))

        await runFromNode(
          nodeId,
          undefined,
          nodes,
          edges,
          callbacks,
          makeRunOptions(get, workflowId),
        )

        const afterWf = getWorkflow(get, workflowId)
        if (afterWf) {
          const stem = node.data.srcFilename

          await saveOutputNodes(
            afterWf.nodes,
            afterWf.edges,
            afterWf.results,
            downstreamIds,
            stem,
          )
        }

        set((s) => ({
          workflows: updateWorkflow(s.workflows, workflowId, () => ({
            isRunning: false,
          })),
        }))
        return
      }

      const incomingEdge = edges.find((e) => e.target === nodeId)
      const upstreamId = incomingEdge?.source
      if (!upstreamId) return

      const upstreamResult = wf.results[upstreamId]
      if (!upstreamResult?.outputDataUrl) return

      const device = await getGPUDevice()
      const initialInput = await dataUrlToGPUBuffer(
        device,
        upstreamResult.outputDataUrl,
      )

      const affectedIds = getDownstreamIds(nodeId, edges)
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => {
          const results = { ...w.results }
          for (const id of affectedIds) {
            revokeOldUrl(results[id]?.outputDataUrl)
            results[id] = { status: 'idle', outputDataUrl: null, error: null }
          }
          return { isRunning: true, results }
        }),
      }))

      await runFromNode(
        nodeId,
        initialInput,
        nodes,
        edges,
        callbacks,
        makeRunOptions(get, workflowId),
      )

      const afterWf = getWorkflow(get, workflowId)
      if (afterWf)
        await saveOutputNodes(
          afterWf.nodes,
          afterWf.edges,
          afterWf.results,
          affectedIds,
        )

      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, () => ({
          isRunning: false,
        })),
      }))
    },

    runBatch: async (workflowId: string, nodeId: string) => {
      await runBatchCollect(set, get, workflowId, nodeId)
    },

    resetWorkflow: (workflowId: string) => {
      set((s) => {
        const wf = s.workflows.find((w) => w.id === workflowId)
        if (wf) {
          for (const result of Object.values(wf.results)) {
            revokeOldUrl(result?.outputDataUrl)
          }
        }
        return {
          workflows: updateWorkflow(s.workflows, workflowId, () => ({
            results: {},
            isRunning: false,
          })),
        }
      })
    },
  }
}
