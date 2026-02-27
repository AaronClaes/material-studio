import JSZip from 'jszip'
import type { RunResultItem, WorkflowRun } from '@/features/workflow/lib/run-store'
import type { StudioNode } from '@/features/workflow/types'

async function downloadBlob(url: string, filename: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function downloadAll(
  run: WorkflowRun,
  items: Array<RunResultItem>,
  nodes: Array<StudioNode>,
): Promise<void> {
  const nodeLabel = (nodeId: string): string => {
    const n = nodes.find((x) => x.id === nodeId)
    return n?.data.label ?? nodeId
  }

  const zip = new JSZip()
  const nameCounters = new Map<string, number>()

  for (const item of items) {
    const folder = item.inputFilename || 'output'
    const baseLabel = nodeLabel(item.outputNodeId).replace(/[/\\]/g, '_')
    const counterKey = `${folder}/${baseLabel}`
    const count = nameCounters.get(counterKey) ?? 0
    nameCounters.set(counterKey, count + 1)
    const suffix = count > 0 ? `_${count + 1}` : ''
    const filename = `${folder}/${baseLabel}${suffix}.png`

    if (item.outputDataUrl) {
      const response = await fetch(item.outputDataUrl)
      const blob = await response.blob()
      zip.file(filename, blob)
    }
  }

  const content = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(content)
  a.download = `run-${new Date(run.completedAt).toISOString().slice(0, 19).replace(/[T:]/g, '-')}.zip`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function downloadCurrent(
  outputDataUrl: string,
  inputFilename: string,
  stepLabel: string,
) {
  const inputName = inputFilename || 'output'
  const safeLabel = stepLabel.replace(/[/\\]/g, '_')
  downloadBlob(outputDataUrl, `${inputName}_${safeLabel}.png`)
}
