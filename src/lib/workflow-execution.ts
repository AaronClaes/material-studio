import {
  getDownstreamIds,
  runFromNode,
  runSingleNode,
  runWorkflow,
} from './execution'
import { dataUrlToImageData, processInputNode } from './processors'
import { useDirectoryStore } from './directory-store'
import { updateWorkflow } from './workflow-crud'
import type { ExecutionResults, StudioNode } from '@/types/studio'
import type { StoreGet, StoreSet, WorkflowDef } from './workflow-types'

/**
 * Saves completed output nodes directly to their configured directory.
 * `filter` limits which node IDs are considered (pass the set of nodes that
 * just ran so stale results from earlier runs are never re-saved).
 */
async function saveOutputNodes(
  nodes: Array<StudioNode>,
  results: ExecutionResults,
  filter: Set<string>,
  stemOverride?: string,
): Promise<void> {
  let stem: string
  if (stemOverride !== undefined) {
    stem = stemOverride
  } else {
    const inputNode = nodes.find((n) => n.data.kind === 'inputNode')
    stem =
      inputNode?.data.kind === 'inputNode'
        ? (inputNode.data.srcFilename ?? '')
        : ''
  }

  for (const node of nodes) {
    if (!filter.has(node.id)) continue
    if (node.data.kind !== 'outputNode' || node.data.disabled) continue
    const result = results[node.id]
    if (result?.status !== 'done' || !result.outputDataUrl) continue
    const dirHandle = useDirectoryStore.getState().handles[node.id]
    if (!dirHandle) continue
    const outputStem = (node.data.filename || 'output').replace('{name}', stem)
    const filename = `${outputStem}.${node.data.format}`
    try {
      const response = await fetch(result.outputDataUrl)
      const blob = await response.blob()
      const fh = await dirHandle.getFileHandle(filename, { create: true })
      const writable = await fh.createWritable()
      await writable.write(blob)
      await writable.close()
    } catch (err) {
      console.error(`Failed to save ${filename}:`, err)
    }
  }
}

function makeCallbacks(
  set: StoreSet,
  workflowId: string,
): Parameters<typeof runWorkflow>[2] {
  return {
    onNodeStart: (id) => {
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          results: {
            ...w.results,
            [id]: { status: 'running', outputDataUrl: null, error: null },
          },
        })),
      }))
    },
    onNodeDone: (id, dataUrl) => {
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          results: {
            ...w.results,
            [id]: { status: 'done', outputDataUrl: dataUrl, error: null },
          },
        })),
      }))
    },
    onNodeError: (id, error) => {
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          results: {
            ...w.results,
            [id]: { status: 'error', outputDataUrl: null, error },
          },
        })),
      }))
    },
    onNodeSkipped: (id, dataUrl) => {
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          results: {
            ...w.results,
            [id]: { status: 'skipped', outputDataUrl: dataUrl, error: null },
          },
        })),
      }))
    },
  }
}

function getWorkflow(
  get: StoreGet,
  workflowId: string,
): WorkflowDef | undefined {
  return get().workflows.find((w) => w.id === workflowId)
}

export function buildExecutionActions(set: StoreSet, get: StoreGet) {
  return {
    run: async (workflowId: string) => {
      const wf = getWorkflow(get, workflowId)
      if (!wf || wf.isRunning) return

      const { nodes, edges } = wf

      const batchNodeIds = nodes
        .filter((n) => n.data.kind === 'inputNode' && n.data.batch)
        .map((n) => n.id)
        .filter((id) => useDirectoryStore.getState().handles[id])

      for (const nodeId of batchNodeIds) {
        await get().runBatch(workflowId, nodeId)
      }

      const hasRegularInputs = nodes.some(
        (n) => n.data.kind === 'inputNode' && !n.data.batch && n.data.src,
      )
      if (!hasRegularInputs) return

      const allIds = new Set(nodes.map((n) => n.id))
      const idle: ExecutionResults = {}
      for (const node of nodes) {
        idle[node.id] = { status: 'idle', outputDataUrl: null, error: null }
      }

      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, () => ({
          isRunning: true,
          results: idle,
        })),
      }))

      await runWorkflow(nodes, edges, makeCallbacks(set, workflowId))

      const afterWf = getWorkflow(get, workflowId)
      if (afterWf) await saveOutputNodes(afterWf.nodes, afterWf.results, allIds)

      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, () => ({
          isRunning: false,
        })),
      }))
    },

    runNode: async (workflowId: string, nodeId: string) => {
      const wf = getWorkflow(get, workflowId)
      if (!wf || wf.isRunning) return

      const { nodes, edges } = wf
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return
      if (node.data.kind !== 'inputNode' && node.data.disabled) return

      let input: ImageData

      if (node.data.kind === 'inputNode') {
        if (!node.data.src) return
        input = await processInputNode(node.data.src)
      } else {
        const incomingEdge = edges.find((e) => e.target === nodeId)
        const upstreamId = incomingEdge?.source
        if (!upstreamId) return
        const upstreamResult = wf.results[upstreamId]
        if (!upstreamResult?.outputDataUrl) return
        input = await dataUrlToImageData(upstreamResult.outputDataUrl)
      }

      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
          results: {
            ...w.results,
            [nodeId]: { status: 'running', outputDataUrl: null, error: null },
          },
        })),
      }))

      await runSingleNode(nodeId, input, nodes, makeCallbacks(set, workflowId))

      const afterWf = getWorkflow(get, workflowId)
      if (afterWf)
        await saveOutputNodes(afterWf.nodes, afterWf.results, new Set([nodeId]))
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
              results[id] = { status: 'idle', outputDataUrl: null, error: null }
            }
            return { isRunning: true, results }
          }),
        }))

        await runFromNode(nodeId, undefined, nodes, edges, callbacks)

        const afterWf = getWorkflow(get, workflowId)
        if (afterWf)
          await saveOutputNodes(afterWf.nodes, afterWf.results, downstreamIds)

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

      const initialInput = await dataUrlToImageData(
        upstreamResult.outputDataUrl,
      )

      const affectedIds = getDownstreamIds(nodeId, edges)
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, (w) => {
          const results = { ...w.results }
          for (const id of affectedIds) {
            results[id] = { status: 'idle', outputDataUrl: null, error: null }
          }
          return { isRunning: true, results }
        }),
      }))

      await runFromNode(nodeId, initialInput, nodes, edges, callbacks)

      const afterWf = getWorkflow(get, workflowId)
      if (afterWf)
        await saveOutputNodes(afterWf.nodes, afterWf.results, affectedIds)

      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, () => ({
          isRunning: false,
        })),
      }))
    },

    runBatch: async (workflowId: string, nodeId: string) => {
      const wf = getWorkflow(get, workflowId)
      if (!wf || wf.isRunning) return

      const handle = useDirectoryStore.getState().handles[nodeId]
      if (!handle) return

      const IMAGE_EXTENSIONS = new Set([
        'png',
        'jpg',
        'jpeg',
        'webp',
        'gif',
        'bmp',
        'tiff',
        'avif',
      ])
      const fileHandles: Array<FileSystemFileHandle> = []
      // @ts-expect-error - values() is not supported in the type
      for await (const entry of handle.values()) {
        if (entry.kind !== 'file') continue
        const ext = entry.name.split('.').pop()?.toLowerCase() ?? ''
        if (IMAGE_EXTENSIONS.has(ext))
          fileHandles.push(entry as FileSystemFileHandle)
      }
      fileHandles.sort((a, b) => a.name.localeCompare(b.name))
      if (fileHandles.length === 0) return

      get().patchNodeData(workflowId, nodeId, {
        processedCount: 0,
        fileCount: fileHandles.length,
      })
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, () => ({
          isRunning: true,
        })),
      }))

      for (let i = 0; i < fileHandles.length; i++) {
        const file = await fileHandles[i].getFile()
        const stem = file.name.replace(/\.[^.]+$/, '')
        const fileDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target!.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        get().patchNodeData(workflowId, nodeId, {
          src: fileDataUrl,
          srcFilename: stem,
        })

        // Re-fetch nodes after patchNodeData so processNode sees the updated src
        const { nodes, edges } = get().workflows.find(
          (w) => w.id === workflowId,
        )!
        const downstreamIds = getDownstreamIds(nodeId, edges)
        set((s) => ({
          workflows: updateWorkflow(s.workflows, workflowId, (w) => {
            const results = { ...w.results }
            for (const id of downstreamIds) {
              results[id] = { status: 'idle', outputDataUrl: null, error: null }
            }
            return { results }
          }),
        }))

        try {
          await runFromNode(
            nodeId,
            undefined,
            nodes,
            edges,
            makeCallbacks(set, workflowId),
          )
        } catch (err) {
          console.error(`Batch: skipping ${file.name}:`, err)
        }

        const afterWf = get().workflows.find((w) => w.id === workflowId)!
        await saveOutputNodes(
          afterWf.nodes,
          afterWf.results,
          downstreamIds,
          stem,
        )

        get().patchNodeData(workflowId, nodeId, { processedCount: i + 1 })
      }

      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, () => ({
          isRunning: false,
        })),
      }))
    },

    resetWorkflow: (workflowId: string) => {
      set((s) => ({
        workflows: updateWorkflow(s.workflows, workflowId, () => ({
          results: {},
          isRunning: false,
        })),
      }))
    },
  }
}
