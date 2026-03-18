import {
  getDownstreamIds,
  runFromNode,
  runFromNodeWithInputs,
  runSingleNode,
  runSingleNodeWithInputs,
} from '../lib/execution'
import { formatTimestamp } from '../lib/run-utils'
import { updateWorkflow } from './workflow-crud'
import {
  getWorkflow,
  makeCallbacks,
  makeRunOptions,
  revokeOldUrl,
} from './workflow-callbacks'
import { buildRunItems, saveOutputNodes } from './workflow-output-saver'
import { runBatchCollect, runGDriveBatchCollect } from './workflow-batch'
import { useRunHistoryStore } from './run-history-store'
import type { RunResultItem, WorkflowRun } from '../lib/run-store'
import type { StoreGet, StoreSet } from './workflow-types'
import type { GPUImageBuffer } from '@/features/workflow/types'
import type { RunItem, RunMeta } from '@/shared/lib/run-history-types'
import { notify } from '@/shared/stores/settings-store'
import { saveRunFile } from '@/shared/lib/image-opfs'
import { useDirectoryStore } from '@/shared/stores/directory-store'
import { getGPUDevice } from '@/shared/gpu'
import { dataUrlToGPUBuffer, processInputNode } from '@/shared/gpu/processors'

async function saveToRunHistory(run: WorkflowRun): Promise<void> {
  const persistedItems: Array<RunItem> = await Promise.all(
    run.items.map(async (item) => {
      const chain = await Promise.all(
        item.chain.map(async (step) => {
          let storedFile: string | null = null
          if (step.outputDataUrl) {
            try {
              storedFile = await saveRunFile(
                run.workflowId,
                run.id,
                step.nodeId,
                item.inputFilename,
                step.outputDataUrl,
              )
            } catch {}
          }
          return { nodeId: step.nodeId, nodeData: step.nodeData, storedFile }
        }),
      )
      const lastStepId = item.chain.at(-1)?.nodeId
      const storedFile =
        chain.find((s) => s.nodeId === lastStepId)?.storedFile ?? null
      return {
        outputNodeId: item.outputNodeId,
        storedFile,
        inputFilename: item.inputFilename,
        inputNodeId: item.inputNodeId,
        chain,
      }
    }),
  )

  const meta: RunMeta = {
    id: run.id,
    name: run.name,
    workflowId: run.workflowId,
    completedAt: run.completedAt,
    durationMs: run.durationMs,
    items: persistedItems,
  }

  useRunHistoryStore.getState().saveRun(meta)
}

export function buildExecutionActions(set: StoreSet, get: StoreGet) {
  return {
    run: async (workflowId: string) => {
      const wf = getWorkflow(get, workflowId)
      if (!wf || wf.isRunning) return

      const startTime = Date.now()

      const { nodes, edges } = wf

      const batchNodeIds = nodes
        .filter((n) => n.data.kind === 'inputNode' && n.data.batch)
        .map((n) => n.id)
        .filter((id) => useDirectoryStore.getState().handles[id])

      const gDriveBatchNodeIds = nodes
        .filter(
          (n) =>
            n.data.kind === 'googleDriveInputNode' &&
            n.data.batch &&
            n.data.folderId,
        )
        .map((n) => n.id)

      const allBatchItems: Array<RunResultItem> = []
      for (const nodeId of batchNodeIds) {
        const items = await runBatchCollect(set, get, workflowId, nodeId)
        allBatchItems.push(...items)
      }
      for (const nodeId of gDriveBatchNodeIds) {
        const items = await runGDriveBatchCollect(set, get, workflowId, nodeId)
        allBatchItems.push(...items)
      }

      const regularInputs = nodes.filter(
        (n) =>
          (n.data.kind === 'inputNode' && !n.data.batch && n.data.src) ||
          (n.data.kind === 'googleDriveInputNode' &&
            !n.data.batch &&
            n.data.src),
      )
      if (regularInputs.length === 0) {
        if (allBatchItems.length > 0) {
          const completedAt = Date.now()
          const run: WorkflowRun = {
            id: crypto.randomUUID(),
            name: formatTimestamp(completedAt),
            workflowId,
            completedAt,
            durationMs: completedAt - startTime,
            items: allBatchItems,
          }
          saveToRunHistory(run).catch(() => {})
          const wfName = getWorkflow(get, workflowId)?.name ?? 'Workflow'
          notify(`${wfName} complete`, {
            body: `${allBatchItems.length} output(s) processed`,
          })
        }
        return
      }

      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, () => ({
          isRunning: true,
        })),
      }))

      const allRegularItems: Array<RunResultItem> = []
      // Track blob URLs captured in any prior items so per-iteration resets
      // don't revoke them before they can be shown in the run overview.
      // Seed with batch items so the regular-input resets don't clobber them.
      const capturedUrls = new Set<string>()
      for (const item of allBatchItems) {
        if (item.outputDataUrl?.startsWith('blob:'))
          capturedUrls.add(item.outputDataUrl)
        for (const step of item.chain) {
          if (step.outputDataUrl?.startsWith('blob:'))
            capturedUrls.add(step.outputDataUrl)
        }
      }

      // Process each regular input node sequentially so every output item is
      // correctly attributed to its source input file (mirrors batch behaviour).
      for (const inputNode of regularInputs) {
        const downstreamIds = getDownstreamIds(inputNode.id, edges)

        set((s) => ({
          workflows: updateWorkflow(s.workflows, workflowId, (w) => {
            const results = { ...w.results }
            for (const id of downstreamIds) {
              const url = results[id]?.outputDataUrl
              if (url && !capturedUrls.has(url)) revokeOldUrl(url)
              results[id] = { status: 'idle', outputDataUrl: null, error: null }
            }
            return { results }
          }),
        }))

        const callbacks = makeCallbacks(set, workflowId)
        const runOptions = makeRunOptions(get, workflowId)

        try {
          await runFromNode(
            inputNode.id,
            undefined,
            getWorkflow(get, workflowId)!.nodes,
            edges,
            callbacks,
            runOptions,
          )
        } catch (err) {
          console.error(`Run: skipping input ${inputNode.id}:`, err)
        }

        const afterWf = getWorkflow(get, workflowId)!
        const stem =
          inputNode.data.kind === 'inputNode' ||
          inputNode.data.kind === 'googleDriveInputNode'
            ? (inputNode.data.srcFilename ?? '')
            : ''

        await saveOutputNodes(
          afterWf.nodes,
          afterWf.edges,
          afterWf.results,
          downstreamIds,
          stem || undefined,
        )
        const items = buildRunItems(
          afterWf.nodes,
          afterWf.edges,
          afterWf.results,
        ).map((item) => ({
          ...item,
          inputFilename: stem,
          inputNodeId: inputNode.id,
        }))
        for (const item of items) {
          if (item.outputDataUrl?.startsWith('blob:'))
            capturedUrls.add(item.outputDataUrl)
          for (const step of item.chain) {
            if (step.outputDataUrl?.startsWith('blob:'))
              capturedUrls.add(step.outputDataUrl)
          }
        }
        allRegularItems.push(...items)
      }

      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, () => ({
          isRunning: false,
        })),
      }))

      const finalWf = getWorkflow(get, workflowId)
      if (finalWf) {
        const items = [...allBatchItems, ...allRegularItems]
        if (items.length > 0) {
          const completedAt = Date.now()
          const run: WorkflowRun = {
            id: crypto.randomUUID(),
            name: formatTimestamp(completedAt),
            workflowId,
            completedAt,
            durationMs: completedAt - startTime,
            items,
          }
          saveToRunHistory(run).catch(() => {})
          notify(`${finalWf.name} complete`, {
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
      if (
        node.data.kind !== 'inputNode' &&
        node.data.kind !== 'googleDriveInputNode' &&
        node.data.disabled
      )
        return

      const device = await getGPUDevice()

      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          results: {
            ...w.results,
            [nodeId]: { status: 'running', outputDataUrl: null, error: null },
          },
        })),
      }))

      if (
        node.data.kind === 'inputNode' ||
        node.data.kind === 'googleDriveInputNode'
      ) {
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
        const incomingEdgeList = edges.filter((e) => e.target === nodeId)
        if (incomingEdgeList.length === 0) return
        const callbacks = makeCallbacks(set, workflowId)
        const runOpts = makeRunOptions(get, workflowId)
        const inputs: Array<GPUImageBuffer> = []
        for (const edge of incomingEdgeList) {
          const upstreamResult = wf.results[edge.source]
          if (!upstreamResult?.outputDataUrl) continue
          inputs.push(await dataUrlToGPUBuffer(device, upstreamResult.outputDataUrl))
        }
        if (inputs.length > 0) {
          await runSingleNodeWithInputs(nodeId, inputs, nodes, callbacks, runOpts)
          for (const input of inputs) input.buffer.destroy()
        }
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

      if (
        node.data.kind === 'inputNode' ||
        node.data.kind === 'googleDriveInputNode'
      ) {
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

      const incomingEdgeList = edges.filter((e) => e.target === nodeId)
      if (incomingEdgeList.length === 0) return

      const validUpstreams = incomingEdgeList
        .map((e) => ({ source: e.source, result: wf.results[e.source] }))
        .filter((u) => !!u.result?.outputDataUrl)
      if (validUpstreams.length === 0) return

      const device = await getGPUDevice()

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

      const runOpts = makeRunOptions(get, workflowId)
      const upstreamBuffers = new Map<string, GPUImageBuffer>()
      for (const upstream of validUpstreams) {
        upstreamBuffers.set(
          upstream.source,
          await dataUrlToGPUBuffer(device, upstream.result!.outputDataUrl!),
        )
      }
      await runFromNodeWithInputs(nodeId, upstreamBuffers, nodes, edges, callbacks, runOpts)
      for (const buf of upstreamBuffers.values()) buf.buffer.destroy()

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

    runGDriveBatch: async (workflowId: string, nodeId: string) => {
      await runGDriveBatchCollect(set, get, workflowId, nodeId)
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
