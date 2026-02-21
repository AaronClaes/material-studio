import { useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { IconDownload, IconFolder, IconFolderOpen } from '@tabler/icons-react'
import { BaseNode } from './base-node'
import type { NodeProps } from '@xyflow/react'
import type { StudioEdge, StudioNode } from '@/types/studio'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useExecutionStore } from '@/lib/execution-store'
import { useDirectoryStore } from '@/lib/directory-store'

declare global {
  interface Window {
    showDirectoryPicker: (options?: {
      mode?: 'read' | 'readwrite'
    }) => Promise<FileSystemDirectoryHandle>
  }
}

const supportsDirectoryPicker = 'showDirectoryPicker' in window

export function OutputNode({ id, data, selected }: NodeProps<StudioNode>) {
  if (data.kind !== 'outputNode') return null

  const { setNodes, getNodes, getEdges } = useReactFlow()
  const result = useExecutionStore((s) => s.results[id])
  const results = useExecutionStore((s) => s.results)
  const isRunning = useExecutionStore((s) => s.isRunning)
  const runNode = useExecutionStore((s) => s.runNode)
  const handle = useDirectoryStore((s) => s.handles[id])
  const setHandle = useDirectoryStore((s) => s.setHandle)

  console.log(handle)

  const upstreamId = (getEdges() as Array<StudioEdge>).find(
    (e) => e.target === id,
  )?.source
  const hasValidInput = !!upstreamId && !!results[upstreamId]?.outputDataUrl

  // Auto-save to selected folder whenever status transitions to 'done'
  const prevStatusRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = result?.status

    if (
      result?.status !== 'done' ||
      prev === 'done' ||
      !result.outputDataUrl ||
      !handle
    )
      return

    const dataUrl = result.outputDataUrl
    const filename = `${data.filename || 'output'}.${data.format}`

    async function save() {
      if (!handle) return
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const fileHandle = await handle.getFileHandle(filename, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
    }

    save().catch(console.error)
  }, [result?.status, result?.outputDataUrl, handle])

  async function pickFolder() {
    try {
      const dir = await window.showDirectoryPicker({ mode: 'readwrite' })
      setHandle(id, dir)
    } catch {
      // user cancelled
    }
  }

  function setFormat(format: 'png' | 'jpg' | 'webp') {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, format } } : n,
      ),
    )
  }

  function setFilename(filename: string) {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, filename } } : n,
      ),
    )
  }

  return (
    <BaseNode
      label={data.label}
      icon={<IconDownload size={14} />}
      selected={selected}
      hasOutput={false}
      nodeStatus={result?.status}
      resultPreview={result?.outputDataUrl}
      nodeError={result?.error}
      isRunning={isRunning}
      waitingLabel="Processing workflow…"
      hasValidInput={hasValidInput}
      onRun={() =>
        runNode(
          id,
          getNodes() as Array<StudioNode>,
          getEdges() as Array<StudioEdge>,
        )
      }
    >
      <div className="flex flex-col gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Output Location</Label>
          {supportsDirectoryPicker ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 justify-start gap-1.5 text-xs font-normal truncate"
              onClick={pickFolder}
            >
              {handle ? (
                <>
                  <IconFolderOpen size={13} className="shrink-0" />
                  <span className="truncate">{handle.name}</span>
                </>
              ) : (
                <>
                  <IconFolder
                    size={13}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="text-muted-foreground">Choose folder…</span>
                </>
              )}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Not supported in this browser
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Filename</Label>
          <Input
            value={data.filename}
            onChange={(e) => setFilename(e.target.value)}
            className="h-7 text-xs"
            placeholder="output"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Format</Label>
          <Select value={data.format} onValueChange={setFormat}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="jpg">JPG</SelectItem>
              <SelectItem value="webp">WebP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </BaseNode>
  )
}
