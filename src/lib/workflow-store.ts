import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addEdge, applyEdgeChanges, applyNodeChanges } from '@xyflow/react'
import {
  getDownstreamIds,
  runFromNode,
  runSingleNode,
  runWorkflow,
} from './execution'
import { dataUrlToImageData, processInputNode } from './processors'
import { createInitialGraph } from './workflow'
import type { Connection, EdgeChange, NodeChange } from '@xyflow/react'
import type { ExecutionResults, StudioEdge, StudioNode } from '@/types/studio'

export interface WorkflowDef {
  id: string
  name: string
  nodes: Array<StudioNode>
  edges: Array<StudioEdge>
  results: ExecutionResults
  isRunning: boolean
}

interface WorkflowStore {
  workflows: Array<WorkflowDef>
  activeWorkflowId: string

  // Workflow management
  addWorkflow: () => void
  deleteWorkflow: (id: string) => void
  duplicateWorkflow: (id: string) => void
  setActiveWorkflowId: (id: string) => void
  renameWorkflow: (id: string, name: string) => void
  importWorkflow: (def: {
    name: string
    nodes: Array<StudioNode>
    edges: Array<StudioEdge>
  }) => void

  // Graph mutations
  onNodesChange: (workflowId: string, changes: Array<NodeChange>) => void
  onEdgesChange: (workflowId: string, changes: Array<EdgeChange>) => void
  addNode: (workflowId: string, node: StudioNode) => void
  onConnect: (workflowId: string, connection: Connection) => void
  patchNodeData: (
    workflowId: string,
    nodeId: string,
    patch: Record<string, unknown>,
  ) => void

  // Execution
  run: (workflowId: string) => Promise<void>
  runNode: (workflowId: string, nodeId: string) => Promise<void>
  runNodesFrom: (workflowId: string, nodeId: string) => Promise<void>
  resetWorkflow: (workflowId: string) => void
}

let _workflowCounter = 1

function createWorkflow(name?: string): WorkflowDef {
  const { nodes, edges } = createInitialGraph()
  return {
    id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name ?? `Workflow ${_workflowCounter++}`,
    nodes,
    edges,
    results: {},
    isRunning: false,
  }
}

function updateWorkflow(
  workflows: Array<WorkflowDef>,
  id: string,
  updater: (w: WorkflowDef) => Partial<WorkflowDef>,
): Array<WorkflowDef> {
  return workflows.map((w) => (w.id === id ? { ...w, ...updater(w) } : w))
}

const initialWorkflow = createWorkflow('Workflow 1')

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
      workflows: [initialWorkflow],
      activeWorkflowId: initialWorkflow.id,

      addWorkflow: () => {
        const existing = get().workflows
        _workflowCounter = existing.length + 1
        const w = createWorkflow(`Workflow ${existing.length + 1}`)
        set((s) => ({
          workflows: [...s.workflows, w],
          activeWorkflowId: w.id,
        }))
      },

      duplicateWorkflow: (id) => {
        const wf = get().workflows.find((w) => w.id === id)
        if (!wf) return
        const copy: WorkflowDef = {
          id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: `${wf.name} copy`,
          nodes: wf.nodes.map((n) =>
            n.data.kind === 'inputNode'
              ? { ...n, data: { ...n.data, src: '' } }
              : n,
          ),
          edges: wf.edges,
          results: {},
          isRunning: false,
        }
        set((s) => ({
          workflows: [...s.workflows, copy],
          activeWorkflowId: copy.id,
        }))
      },

      deleteWorkflow: (id) => {
        const { workflows, activeWorkflowId } = get()
        if (workflows.length <= 1) return
        const remaining = workflows.filter((w) => w.id !== id)
        const nextActive =
          activeWorkflowId === id
            ? (remaining[remaining.length - 1]?.id ?? remaining[0].id)
            : activeWorkflowId
        set({ workflows: remaining, activeWorkflowId: nextActive })
      },

      setActiveWorkflowId: (id) => set({ activeWorkflowId: id }),

      renameWorkflow: (id, name) => {
        set((s) => ({
          workflows: updateWorkflow(s.workflows, id, () => ({ name })),
        }))
      },

      importWorkflow: (def) => {
        const w: WorkflowDef = {
          id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: def.name,
          nodes: def.nodes,
          edges: def.edges,
          results: {},
          isRunning: false,
        }
        set((s) => ({
          workflows: [...s.workflows, w],
          activeWorkflowId: w.id,
        }))
      },

      onNodesChange: (workflowId, changes) => {
        set((s) => ({
          workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
            nodes: applyNodeChanges(changes, w.nodes) as Array<StudioNode>,
          })),
        }))
      },

      onEdgesChange: (workflowId, changes) => {
        set((s) => ({
          workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
            edges: applyEdgeChanges(changes, w.edges) as Array<StudioEdge>,
          })),
        }))
      },

      addNode: (workflowId, node) => {
        set((s) => ({
          workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
            nodes: [...w.nodes, node],
          })),
        }))
      },

      onConnect: (workflowId, connection) => {
        set((s) => ({
          workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
            edges: addEdge({ ...connection, type: 'smoothstep' }, w.edges),
          })),
        }))
      },

      patchNodeData: (workflowId, nodeId, patch) => {
        set((s) => ({
          workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
            nodes: w.nodes.map((n) =>
              n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
            ),
          })),
        }))
      },

      run: async (workflowId) => {
        const wf = get().workflows.find((w) => w.id === workflowId)
        if (!wf || wf.isRunning) return

        const { nodes, edges } = wf
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

        await runWorkflow(nodes, edges, {
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
                  [id]: {
                    status: 'skipped',
                    outputDataUrl: dataUrl,
                    error: null,
                  },
                },
              })),
            }))
          },
        })

        set((s) => ({
          workflows: updateWorkflow(s.workflows, workflowId, () => ({
            isRunning: false,
          })),
        }))
      },

      runNode: async (workflowId, nodeId) => {
        const wf = get().workflows.find((w) => w.id === workflowId)
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

        await runSingleNode(nodeId, input, nodes, {
          onNodeStart: () => {},
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
                  [id]: {
                    status: 'skipped',
                    outputDataUrl: dataUrl,
                    error: null,
                  },
                },
              })),
            }))
          },
        })
      },

      runNodesFrom: async (workflowId, nodeId) => {
        const wf = get().workflows.find((w) => w.id === workflowId)
        if (!wf || wf.isRunning) return

        const { nodes, edges } = wf
        const node = nodes.find((n) => n.id === nodeId)
        if (!node) return

        if (node.data.kind === 'inputNode') {
          if (!node.data.src) return
          const downstreamIds = getDownstreamIds(nodeId, edges)
          set((s) => ({
            workflows: updateWorkflow(s.workflows, workflowId, (w) => {
              const results = { ...w.results }
              for (const id of downstreamIds) {
                results[id] = {
                  status: 'idle',
                  outputDataUrl: null,
                  error: null,
                }
              }
              return { isRunning: true, results }
            }),
          }))

          await runFromNode(nodeId, undefined, nodes, edges, {
            onNodeStart: (id) => {
              set((s) => ({
                workflows: updateWorkflow(s.workflows, workflowId, (w) => ({
                  results: {
                    ...w.results,
                    [id]: {
                      status: 'running',
                      outputDataUrl: null,
                      error: null,
                    },
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
                    [id]: {
                      status: 'skipped',
                      outputDataUrl: dataUrl,
                      error: null,
                    },
                  },
                })),
              }))
            },
          })

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

        await runFromNode(nodeId, initialInput, nodes, edges, {
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
                  [id]: {
                    status: 'skipped',
                    outputDataUrl: dataUrl,
                    error: null,
                  },
                },
              })),
            }))
          },
        })

        set((s) => ({
          workflows: updateWorkflow(s.workflows, workflowId, () => ({
            isRunning: false,
          })),
        }))
      },

      resetWorkflow: (workflowId) => {
        set((s) => ({
          workflows: updateWorkflow(s.workflows, workflowId, () => ({
            results: {},
            isRunning: false,
          })),
        }))
      },
    }),
    {
      name: 'material-studio-workflows',
      partialize: (s) => ({
        activeWorkflowId: s.activeWorkflowId,
        workflows: s.workflows.map((w) => ({
          id: w.id,
          name: w.name,
          nodes: w.nodes.map((n) =>
            n.data.kind === 'inputNode'
              ? { ...n, data: { ...n.data, src: '' } }
              : n,
          ),
          edges: w.edges,
          results: {},
          isRunning: false,
        })),
      }),
    },
  ),
)

export function exportWorkflow(wf: WorkflowDef): void {
  const payload = {
    name: wf.name,
    nodes: wf.nodes.map((n) =>
      n.data.kind === 'inputNode' ? { ...n, data: { ...n.data, src: '' } } : n,
    ),
    edges: wf.edges,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${wf.name.replace(/\s+/g, '-').toLowerCase()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Stable fallback — prevents useSyncExternalStore from seeing a new object every render
const EMPTY_RESULTS: ExecutionResults = {}

// Convenience selectors
export const useActiveWorkflow = () =>
  useWorkflowStore((s) => s.workflows.find((w) => w.id === s.activeWorkflowId))

export const useActiveWorkflowResults = () =>
  useWorkflowStore(
    (s) =>
      s.workflows.find((w) => w.id === s.activeWorkflowId)?.results ??
      EMPTY_RESULTS,
  )

export const useActiveWorkflowIsRunning = () =>
  useWorkflowStore(
    (s) =>
      s.workflows.find((w) => w.id === s.activeWorkflowId)?.isRunning ?? false,
  )

// Stable module-level object — reads activeWorkflowId from getState() at call time
// so the hook never returns a new object reference (which would cause an infinite loop).
const _activeWorkflowActions = {
  run: () => {
    const s = useWorkflowStore.getState()
    return s.run(s.activeWorkflowId)
  },
  runNode: (nodeId: string) => {
    const s = useWorkflowStore.getState()
    return s.runNode(s.activeWorkflowId, nodeId)
  },
  runNodesFrom: (nodeId: string) => {
    const s = useWorkflowStore.getState()
    return s.runNodesFrom(s.activeWorkflowId, nodeId)
  },
  reset: () => {
    const s = useWorkflowStore.getState()
    return s.resetWorkflow(s.activeWorkflowId)
  },
}

export const useActiveWorkflowActions = () => _activeWorkflowActions
