import { getDownstreamIds, runFromNode, runSingleNode } from './execution'
import { dataUrlToImageData, processInputNode } from './processors'
import { useDirectoryStore } from './directory-store'
import { updateWorkflow } from './workflow-crud'
import type { RunCallbacks, RunOptions } from './execution'
import type { ExecutionResults, StudioEdge, StudioNode } from '@/types/studio'
import type { StoreGet, StoreSet, WorkflowDef } from './workflow-types'

/**
 * Saves completed output nodes directly to their configured directory.
 * `filter` limits which node IDs are considered (pass the set of nodes that
 * just ran so stale results from earlier runs are never re-saved).
 */
async function saveOutputNodes(
  nodes: Array<StudioNode>,
  edges: Array<StudioEdge>,
  results: ExecutionResults,
  filter: Set<string>,
  stemOverride?: string,
): Promise<void> {
  // Build upstream map once so we can trace each output back to its input node.
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const incomingEdge = new Map<string, string>()
  for (const edge of edges) {
    if (!incomingEdge.has(edge.target))
      incomingEdge.set(edge.target, edge.source)
  }

  function findUpstreamInputStem(outputId: string): string {
    let currentId: string | undefined = outputId
    while (currentId) {
      const n = nodeMap.get(currentId)
      if (n?.data.kind === 'inputNode') return n.data.srcFilename ?? ''
      currentId = incomingEdge.get(currentId)
    }
    return ''
  }

  for (const node of nodes) {
    if (!filter.has(node.id)) continue
    if (node.data.kind !== 'outputNode' || node.data.disabled) continue
    const result = results[node.id]
    if (result?.status !== 'done' || !result.outputDataUrl) continue
    const dirHandle = useDirectoryStore.getState().handles[node.id]
    if (!dirHandle) continue
    const stem =
      stemOverride !== undefined ? stemOverride : findUpstreamInputStem(node.id)
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

function makeCallbacks(set: StoreSet, workflowId: string): RunCallbacks {
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

function makeRunOptions(get: StoreGet, workflowId: string): RunOptions {
  return {
    currentWorkflowId: workflowId,
    callStack: [workflowId],
    workflowResolver: (targetWorkflowId) => {
      const workflow = get().workflows.find((w) => w.id === targetWorkflowId)
      if (!workflow) return undefined
      return { nodes: workflow.nodes, edges: workflow.edges }
    },
  }
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

      const regularInputs = nodes.filter(
        (n) => n.data.kind === 'inputNode' && !n.data.batch && n.data.src,
      )
      if (regularInputs.length === 0) return

      // Only reset nodes downstream of regular inputs — preserve batch results
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

      await runSingleNode(
        nodeId,
        input,
        nodes,
        makeCallbacks(set, workflowId),
        makeRunOptions(get, workflowId),
      )

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
            makeRunOptions(get, workflowId),
          )
        } catch (err) {
          console.error(`Batch: skipping ${file.name}:`, err)
        }

        const afterWf = get().workflows.find((w) => w.id === workflowId)!
        await saveOutputNodes(
          afterWf.nodes,
          afterWf.edges,
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
