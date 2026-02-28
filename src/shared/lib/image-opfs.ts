import { FileCollection } from './opfs'
import type { MapKey } from '@/features/material-viewer/lib/material-definitions'

const workflowInputs = new FileCollection('workflow-inputs')
const workflowResults = new FileCollection('workflow-results')
const repeatTester = new FileCollection('repeat-tester')
const materialViewer = new FileCollection('material-viewer')

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

// Workflow results
export async function saveWorkflowResult(
  workflowId: string,
  nodeId: string,
  blobUrl: string,
): Promise<void> {
  const blob = await fetch(blobUrl).then((r) => r.blob())
  await workflowResults.writeFile(`${workflowId}-${nodeId}.png`, blob)
}

export async function loadWorkflowResult(
  workflowId: string,
  nodeId: string,
): Promise<string | null> {
  try {
    return await workflowResults.getFileUrl(`${workflowId}-${nodeId}.png`)
  } catch {
    return null
  }
}

export async function loadAllWorkflowResults(
  workflowId: string,
): Promise<Record<string, string>> {
  const files = await workflowResults.listFiles()
  const prefix = `${workflowId}-`
  const matching = files.filter(
    (f) => f.startsWith(prefix) && f.endsWith('.png'),
  )
  const entries = await Promise.all(
    matching.map(async (f) => {
      const nodeId = f.slice(prefix.length, -'.png'.length)
      const url = await workflowResults.getFileUrl(f)
      return [nodeId, url] as [string, string]
    }),
  )
  return Object.fromEntries(entries)
}

export async function deleteWorkflowResults(workflowId: string): Promise<void> {
  const files = await workflowResults.listFiles()
  const prefix = `${workflowId}-`
  await Promise.all(
    files
      .filter((f) => f.startsWith(prefix))
      .map((f) => workflowResults.deleteFile(f).catch(() => {})),
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
