import { useEffect, useState } from 'react'
import { IconDownload, IconPhoto } from '@tabler/icons-react'
import type { NodeResult, StudioNode } from '@/types/studio'
import { Button } from '@/components/ui/button'
import { NODE_META } from '@/lib/workflow'

function estimateFileSizeBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  const padding = (base64.match(/=+$/) ?? [''])[0].length
  return Math.floor((base64.length * 3) / 4) - padding
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs">{value}</span>
    </div>
  )
}

interface NodeInspectorPanelProps {
  node: StudioNode
  result: NodeResult | undefined
}

export function NodeInspectorPanel({ node, result }: NodeInspectorPanelProps) {
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(
    null,
  )
  const dataUrl = result?.outputDataUrl ?? null

  useEffect(() => {
    if (!dataUrl) {
      setDimensions(null)
      return
    }
    const img = new Image()
    img.onload = () =>
      setDimensions({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = dataUrl
  }, [dataUrl])

  const meta = NODE_META[node.data.kind]
  const fileSize = dataUrl ? estimateFileSizeBytes(dataUrl) : null

  const handleDownload = () => {
    if (!dataUrl) return
    const mime = dataUrl.split(';')[0].split(':')[1] ?? 'image/png'
    const ext = mime.split('/')[1] ?? 'png'
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${node.data.label}.${ext}`
    a.click()
  }

  return (
    <div className="w-72 shrink-0 border-l bg-card flex flex-col overflow-y-auto">
      <div className="flex items-center border-b px-4 py-2">
        <span className="text-sm font-semibold">Inspector</span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Preview — full, no aspect ratio constraint */}
        <div className="w-full overflow-hidden border bg-muted">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="Full preview"
              className="max-h-64 w-full object-contain"
            />
          ) : (
            <div className="flex h-32 items-center justify-center">
              <IconPhoto size={32} className="text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Download */}
        {dataUrl && (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            onClick={handleDownload}
          >
            <IconDownload size={14} />
            Download
          </Button>
        )}

        <hr className="border-border" />

        {/* Metadata */}
        <div className="flex flex-col gap-3">
          <MetaRow label="Type" value={meta.label} />
          {dimensions && (
            <MetaRow
              label="Resolution"
              value={`${dimensions.w} × ${dimensions.h} px`}
            />
          )}
          {fileSize !== null && (
            <MetaRow label="File size" value={formatBytes(fileSize)} />
          )}
          {result?.status && <MetaRow label="Status" value={result.status} />}
        </div>
      </div>
    </div>
  )
}
