import { create } from 'zustand'
import { runWorkflow } from './execution'
import type { ExecutionResults, StudioEdge, StudioNode } from '@/types/studio'

interface ExecutionStore {
  results: ExecutionResults
  isRunning: boolean
  run: (nodes: Array<StudioNode>, edges: Array<StudioEdge>) => Promise<void>
  reset: () => void
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  results: {},
  isRunning: false,

  run: async (nodes, edges) => {
    if (get().isRunning) return

    // Reset all nodes to idle
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
    })

    set({ isRunning: false })
  },

  reset: () => set({ results: {}, isRunning: false }),
}))
