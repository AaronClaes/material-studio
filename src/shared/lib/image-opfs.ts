import { FileCollection } from './opfs'
import type { MapKey } from '@/features/material-viewer/lib/material-definitions'

const workflowInputs = new FileCollection('workflow-inputs')
const repeatTester = new FileCollection('repeat-tester')
const materialViewer = new FileCollection('material-viewer')
const runHistoryCollection = new FileCollection('workflow-run-history')

// Workflow inputs (single file mode)
export async function saveWorkflowInput(
  workflowId: string,
  nodeId: string,
  blob: Blob,
): Promise<void> {
  await workflowInputs.writeFile(`${workflowId}-${nodeId}.png`, blob)
}

export async function loadWorkflowInput(
  workflowId: string,
  nodeId: string,
): Promise<string | null> {
  try {
    return await workflowInputs.getFileUrl(`${workflowId}-${nodeId}.png`)
  } catch {
    return null
  }
}

export async function deleteWorkflowInput(
  workflowId: string,
  nodeId: string,
): Promise<void> {
  try {
    await workflowInputs.deleteFile(`${workflowId}-${nodeId}.png`)
  } catch {
    // ignore if not found
  }
}

export async function deleteAllWorkflowInputs(workflowId: string): Promise<void> {
  const files = await workflowInputs.listFiles()
  const prefix = `${workflowId}-`
  await Promise.all(
    files
      .filter((f) => f.startsWith(prefix))
      .map((f) => workflowInputs.deleteFile(f).catch(() => {})),
  )
}

// Repeat tester
export async function saveRepeatTesterImage(blob: Blob): Promise<void> {
  await repeatTester.writeFile('image.png', blob)
}

export async function loadRepeatTesterImage(): Promise<string | null> {
  try {
    return await repeatTester.getFileUrl('image.png')
  } catch {
    return null
  }
}

// Material viewer
export async function saveMaterialViewerMap(
  mapKey: MapKey,
  blob: Blob,
): Promise<void> {
  await materialViewer.writeFile(`${mapKey}.png`, blob)
}

export async function loadMaterialViewerMaps(): Promise<
  Partial<Record<MapKey, string>>
> {
  const files = await materialViewer.listFiles()
  const entries = await Promise.all(
    files
      .filter((f) => f.endsWith('.png'))
      .map(async (f) => {
        const key = f.slice(0, -'.png'.length) as MapKey
        const url = await materialViewer.getFileUrl(f)
        return [key, url] as [MapKey, string]
      }),
  )
  return Object.fromEntries(entries)
}

export async function deleteMaterialViewerMap(mapKey: MapKey): Promise<void> {
  try {
    await materialViewer.deleteFile(`${mapKey}.png`)
  } catch {
    // ignore if not found
  }
}

// Run history
export async function saveRunFile(
  workflowId: string,
  runId: string,
  nodeId: string,
  inputFilename: string,
  blobUrl: string,
): Promise<string> {
  const safeFilename = inputFilename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filename = `${workflowId}--${runId}--${nodeId}--${safeFilename}.png`
  const blob = await fetch(blobUrl).then((r) => r.blob())
  await runHistoryCollection.writeFile(filename, blob)
  return filename
}

export async function loadRunFiles(
  workflowId: string,
  runId: string,
): Promise<Record<string, string>> {
  const prefix = `${workflowId}--${runId}--`
  const files = await runHistoryCollection.listFiles()
  const matching = files.filter(
    (f) => f.startsWith(prefix) && f.endsWith('.png'),
  )
  const entries = await Promise.all(
    matching.map(async (f) => {
      const url = await runHistoryCollection.getFileUrl(f)
      return [f, url] as [string, string]
    }),
  )
  return Object.fromEntries(entries)
}

export async function loadRunCoverUrl(
  storedFile: string | null,
): Promise<string | null> {
  if (!storedFile) return null
  try {
    return await runHistoryCollection.getFileUrl(storedFile)
  } catch {
    return null
  }
}

export async function deleteAllWorkflowRunFiles(workflowId: string): Promise<void> {
  const files = await runHistoryCollection.listFiles()
  const prefix = `${workflowId}--`
  await Promise.all(
    files
      .filter((f) => f.startsWith(prefix))
      .map((f) => runHistoryCollection.deleteFile(f).catch(() => {})),
  )
}

export async function deleteRunFromHistory(
  workflowId: string,
  runId: string,
): Promise<void> {
  const files = await runHistoryCollection.listFiles()
  const prefix = `${workflowId}--${runId}--`
  await Promise.all(
    files
      .filter((f) => f.startsWith(prefix))
      .map((f) => runHistoryCollection.deleteFile(f).catch(() => {})),
  )
}
