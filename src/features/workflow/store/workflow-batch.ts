import { getDownstreamIds, runFromNode } from '../lib/execution'
import { updateWorkflow } from './workflow-crud'
import {
  getWorkflow,
  makeCallbacks,
  makeRunOptions,
  revokeOldUrl,
} from './workflow-callbacks'
import { buildRunItems, saveOutputNodes } from './workflow-output-saver'
import type { StoreGet, StoreSet } from './workflow-types'
import type { RunResultItem } from '../lib/run-store'
import { IMAGE_EXTENSIONS } from '@/shared/lib/image-extensions'
import { fileToDataUrl } from '@/shared/lib/file-to-data-url'
import { useDirectoryStore } from '@/shared/stores/directory-store'
import {
  useGoogleAuthStore,
  listFolderImages,
  downloadFileAsDataUrl,
} from '@/features/google-drive'

export async function runBatchCollect(
  set: StoreSet,
  get: StoreGet,
  workflowId: string,
  nodeId: string,
): Promise<Array<RunResultItem>> {
  const wf = getWorkflow(get, workflowId)
  if (!wf || wf.isRunning) return []

  const handle = useDirectoryStore.getState().handles[nodeId]
  if (!handle) return []

  const fileHandles: Array<FileSystemFileHandle> = []
  // @ts-expect-error - values() is not supported in the type
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file') continue
    const ext = entry.name.split('.').pop()?.toLowerCase() ?? ''
    if (IMAGE_EXTENSIONS.has(ext))
      fileHandles.push(entry as FileSystemFileHandle)
  }
  fileHandles.sort((a, b) => a.name.localeCompare(b.name))
  if (fileHandles.length === 0) return []

  get().patchNodeData(workflowId, nodeId, {
    processedCount: 0,
    fileCount: fileHandles.length,
  })
  set((s) => ({
    workflows: updateWorkflow(s.workflows, workflowId, () => ({
      isRunning: true,
    })),
  }))

  const allItems: Array<RunResultItem> = []
  // Track blob URLs captured in allItems so the per-iteration reset step does
  // not revoke them before they can be displayed in the run overview.
  const capturedUrls = new Set<string>()

  for (let i = 0; i < fileHandles.length; i++) {
    const fileHandle = fileHandles[i]
    if (!fileHandle) continue
    const file = await fileHandle.getFile()
    const stem = file.name.replace(/\.[^.]+$/, '')
    const fileDataUrl = await fileToDataUrl(file)

    get().patchNodeData(workflowId, nodeId, {
      src: fileDataUrl,
      srcFilename: stem,
    })

    const { nodes, edges } = getWorkflow(get, workflowId)!
    const downstreamIds = getDownstreamIds(nodeId, edges)
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

    const afterWf = getWorkflow(get, workflowId)!
    await saveOutputNodes(
      afterWf.nodes,
      afterWf.edges,
      afterWf.results,
      downstreamIds,
      stem,
    )

    const newItems = buildRunItems(
      afterWf.nodes,
      afterWf.edges,
      afterWf.results,
    ).map((item) => ({ ...item, inputFilename: stem, inputNodeId: nodeId }))
    for (const item of newItems) {
      if (item.outputDataUrl?.startsWith('blob:'))
        capturedUrls.add(item.outputDataUrl)
      for (const step of item.chain) {
        if (step.outputDataUrl?.startsWith('blob:'))
          capturedUrls.add(step.outputDataUrl)
      }
    }
    allItems.push(...newItems)

    get().patchNodeData(workflowId, nodeId, { processedCount: i + 1 })
  }

  set((s) => ({
    workflows: updateWorkflow(s.workflows, workflowId, () => ({
      isRunning: false,
    })),
  }))

  return allItems
}

export async function runGDriveBatchCollect(
  set: StoreSet,
  get: StoreGet,
  workflowId: string,
  nodeId: string,
): Promise<Array<RunResultItem>> {
  const wf = getWorkflow(get, workflowId)
  if (!wf || wf.isRunning) return []

  const node = wf.nodes.find((n) => n.id === nodeId)
  if (!node || node.data.kind !== 'googleDriveInputNode' || !node.data.folderId)
    return []

  const accessToken = useGoogleAuthStore.getState().accessToken
  if (!accessToken) return []

  const files = await listFolderImages(accessToken, node.data.folderId)
  if (files.length === 0) return []

  get().patchNodeData(workflowId, nodeId, {
    processedCount: 0,
    fileCount: files.length,
  })
  set((s) => ({
    workflows: updateWorkflow(s.workflows, workflowId, () => ({
      isRunning: true,
    })),
  }))

  const allItems: Array<RunResultItem> = []
  const capturedUrls = new Set<string>()

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file) continue
    const stem = file.name.replace(/\.[^.]+$/, '')

    // Re-check token validity before each download
    const token = useGoogleAuthStore.getState().accessToken
    if (!token) break

    const fileDataUrl = await downloadFileAsDataUrl(token, file.id)

    get().patchNodeData(workflowId, nodeId, {
      src: fileDataUrl,
      srcFilename: stem,
    })

    const { nodes, edges } = getWorkflow(get, workflowId)!
    const downstreamIds = getDownstreamIds(nodeId, edges)
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
      console.error(`GDrive batch: skipping ${file.name}:`, err)
    }

    const afterWf = getWorkflow(get, workflowId)!
    await saveOutputNodes(
      afterWf.nodes,
      afterWf.edges,
      afterWf.results,
      downstreamIds,
      stem,
    )

    const newItems = buildRunItems(
      afterWf.nodes,
      afterWf.edges,
      afterWf.results,
    ).map((item) => ({ ...item, inputFilename: stem, inputNodeId: nodeId }))
    for (const item of newItems) {
      if (item.outputDataUrl?.startsWith('blob:'))
        capturedUrls.add(item.outputDataUrl)
      for (const step of item.chain) {
        if (step.outputDataUrl?.startsWith('blob:'))
          capturedUrls.add(step.outputDataUrl)
      }
    }
    allItems.push(...newItems)

    get().patchNodeData(workflowId, nodeId, { processedCount: i + 1 })
  }

  set((s) => ({
    workflows: updateWorkflow(s.workflows, workflowId, () => ({
      isRunning: false,
    })),
  }))

  return allItems
}
