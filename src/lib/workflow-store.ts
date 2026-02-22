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
import { useDirectoryStore } from './directory-store'
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
  runBatch: (workflowId: string, nodeId: string) => Promise<void>
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
    const inputNode = nodes.find(
      (n) => n.data.kind === 'inputNode' || n.data.kind === 'batchInputNode',
    )
    stem =
      inputNode?.data.kind === 'inputNode' ||
      inputNode?.data.kind === 'batchInputNode'
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
            n.data.kind === 'inputNode' || n.data.kind === 'batchInputNode'
              ? { ...n, data: { ...n.data, src: '', processedCount: 0 } }
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

        const afterWf = get().workflows.find((w) => w.id === workflowId)
        if (afterWf)
          await saveOutputNodes(afterWf.nodes, afterWf.results, allIds)

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

        const afterWf = get().workflows.find((w) => w.id === workflowId)
        if (afterWf)
          await saveOutputNodes(
            afterWf.nodes,
            afterWf.results,
            new Set([nodeId]),
          )
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
                    [id]: {
                      status: 'done',
                      outputDataUrl: dataUrl,
                      error: null,
                    },
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

          const afterWf = get().workflows.find((w) => w.id === workflowId)
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

        const afterWf = get().workflows.find((w) => w.id === workflowId)
        if (afterWf)
          await saveOutputNodes(afterWf.nodes, afterWf.results, affectedIds)

        set((s) => ({
          workflows: updateWorkflow(s.workflows, workflowId, () => ({
            isRunning: false,
          })),
        }))
      },

      runBatch: async (workflowId, nodeId) => {
        const wf = get().workflows.find((w) => w.id === workflowId)
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
                results[id] = {
                  status: 'idle',
                  outputDataUrl: null,
                  error: null,
                }
              }
              return { results }
            }),
          }))

          try {
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
                      [id]: {
                        status: 'done',
                        outputDataUrl: dataUrl,
                        error: null,
                      },
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
            n.data.kind === 'inputNode' || n.data.kind === 'batchInputNode'
              ? { ...n, data: { ...n.data, src: '', processedCount: 0 } }
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
      n.data.kind === 'inputNode' || n.data.kind === 'batchInputNode'
        ? { ...n, data: { ...n.data, src: '', processedCount: 0 } }
        : n,
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
  runBatch: (nodeId: string) => {
    const s = useWorkflowStore.getState()
    return s.runBatch(s.activeWorkflowId, nodeId)
  },
  reset: () => {
    const s = useWorkflowStore.getState()
    return s.resetWorkflow(s.activeWorkflowId)
  },
}

export const useActiveWorkflowActions = () => _activeWorkflowActions
