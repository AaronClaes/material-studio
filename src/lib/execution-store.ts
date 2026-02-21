import { create } from 'zustand'
import {
  getDownstreamIds,
  runFromNode,
  runSingleNode,
  runWorkflow,
} from './execution'
import { dataUrlToImageData, processInputNode } from './processors'
import type { ExecutionResults, StudioEdge, StudioNode } from '@/types/studio'

interface ExecutionStore {
  results: ExecutionResults
  isRunning: boolean
  run: (nodes: Array<StudioNode>, edges: Array<StudioEdge>) => Promise<void>
  runNode: (
    nodeId: string,
    nodes: Array<StudioNode>,
    edges: Array<StudioEdge>,
  ) => Promise<void>
  runNodesFrom: (
    nodeId: string,
    nodes: Array<StudioNode>,
    edges: Array<StudioEdge>,
  ) => Promise<void>
  reset: () => void
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  results: {},
  isRunning: false,

  run: async (nodes, edges) => {
    if (get().isRunning) return

    const idle: ExecutionResults = {}
    for (const node of nodes) {
      idle[node.id] = { status: 'idle', outputDataUrl: null, error: null }
    }
    set({ isRunning: true, results: idle })

    await runWorkflow(nodes, edges, {
      onNodeStart: (id) => {
        set((s) => ({
          results: {
            ...s.results,
            [id]: { status: 'running', outputDataUrl: null, error: null },
          },
        }))
      },
      onNodeDone: (id, thumbnailDataUrl) => {
        set((s) => ({
          results: {
            ...s.results,
            [id]: {
              status: 'done',
              outputDataUrl: thumbnailDataUrl,
              error: null,
            },
          },
        }))
      },
      onNodeError: (id, error) => {
        set((s) => ({
          results: {
            ...s.results,
            [id]: { status: 'error', outputDataUrl: null, error },
          },
        }))
      },
      onNodeSkipped: (id, dataUrl) => {
        set((s) => ({
          results: {
            ...s.results,
            [id]: { status: 'skipped', outputDataUrl: dataUrl, error: null },
          },
        }))
      },
    })

    set({ isRunning: false })
  },

  runNode: async (nodeId, nodes, edges) => {
    if (get().isRunning) return

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
      const upstreamResult = get().results[upstreamId]
      if (!upstreamResult?.outputDataUrl) return
      input = await dataUrlToImageData(upstreamResult.outputDataUrl)
    }

    set((s) => ({
      results: {
        ...s.results,
        [nodeId]: { status: 'running', outputDataUrl: null, error: null },
      },
    }))

    await runSingleNode(nodeId, input, nodes, {
      onNodeStart: () => {},
      onNodeDone: (id, dataUrl) => {
        set((s) => ({
          results: {
            ...s.results,
            [id]: { status: 'done', outputDataUrl: dataUrl, error: null },
          },
        }))
      },
      onNodeError: (id, error) => {
        set((s) => ({
          results: {
            ...s.results,
            [id]: { status: 'error', outputDataUrl: null, error },
          },
        }))
      },
      onNodeSkipped: (id, dataUrl) => {
        set((s) => ({
          results: {
            ...s.results,
            [id]: { status: 'skipped', outputDataUrl: dataUrl, error: null },
          },
        }))
      },
    })
  },

  runNodesFrom: async (nodeId, nodes, edges) => {
    if (get().isRunning) return

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    // Input node: equivalent to full run
    if (node.data.kind === 'inputNode') {
      await get().run(nodes, edges)
      return
    }

    const incomingEdge = edges.find((e) => e.target === nodeId)
    const upstreamId = incomingEdge?.source
    if (!upstreamId) return

    const upstreamResult = get().results[upstreamId]
    if (!upstreamResult?.outputDataUrl) return

    const initialInput = await dataUrlToImageData(upstreamResult.outputDataUrl)

    // Reset affected nodes to idle
    const affectedIds = getDownstreamIds(nodeId, edges)
    set((s) => {
      const results = { ...s.results }
      for (const id of affectedIds) {
        results[id] = { status: 'idle', outputDataUrl: null, error: null }
      }
      return { isRunning: true, results }
    })

    await runFromNode(nodeId, initialInput, nodes, edges, {
      onNodeStart: (id) => {
        set((s) => ({
          results: {
            ...s.results,
            [id]: { status: 'running', outputDataUrl: null, error: null },
          },
        }))
      },
      onNodeDone: (id, dataUrl) => {
        set((s) => ({
          results: {
            ...s.results,
            [id]: { status: 'done', outputDataUrl: dataUrl, error: null },
          },
        }))
      },
      onNodeError: (id, error) => {
        set((s) => ({
          results: {
            ...s.results,
            [id]: { status: 'error', outputDataUrl: null, error },
          },
        }))
      },
      onNodeSkipped: (id, dataUrl) => {
        set((s) => ({
          results: {
            ...s.results,
            [id]: { status: 'skipped', outputDataUrl: dataUrl, error: null },
          },
        }))
      },
    })

    set({ isRunning: false })
  },

  reset: () => set({ results: {}, isRunning: false }),
}))
