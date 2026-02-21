'use client'

import { useRef, useState } from 'react'
import {
  IconCopy,
  IconPlus,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react'
import type { WorkflowDef } from '@/lib/workflow-store'
import { useWorkflowStore } from '@/lib/workflow-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function WorkflowPanel() {
  const workflows = useWorkflowStore((s) => s.workflows)
  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId)
  const addWorkflow = useWorkflowStore((s) => s.addWorkflow)
  const deleteWorkflow = useWorkflowStore((s) => s.deleteWorkflow)
  const setActiveWorkflowId = useWorkflowStore((s) => s.setActiveWorkflowId)
  const renameWorkflow = useWorkflowStore((s) => s.renameWorkflow)
  const duplicateWorkflow = useWorkflowStore((s) => s.duplicateWorkflow)
  const importWorkflow = useWorkflowStore((s) => s.importWorkflow)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function startEdit(id: string, currentName: string) {
    setEditingId(id)
    setEditValue(currentName)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    if (editingId && editValue.trim()) {
      renameWorkflow(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditingId(null)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return
        importWorkflow(parsed as WorkflowDef)
      } catch {
        // ignore invalid JSON
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="w-52 shrink-0 border-r bg-card flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {workflows.map((wf) => {
          const isActive = wf.id === activeWorkflowId
          const isEditing = editingId === wf.id

          return (
            <div
              key={wf.id}
              className={cn(
                'group flex items-center border-l-3  gap-1 px-3 py-2  cursor-pointer relative',
                isActive
                  ? 'border-primary bg-accent/60'
                  : 'border-transparent hover:bg-accent/30',
              )}
              onClick={() => {
                if (!isEditing) setActiveWorkflowId(wf.id)
              }}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-0 text-sm bg-transparent outline-none border-b border-primary"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="flex-1 min-w-0 text-sm truncate"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    startEdit(wf.id, wf.name)
                  }}
                >
                  {wf.name}
                </span>
              )}

              <Button
                size="xs"
                variant="ghost"
                className="shrink-0 opacity-0 group-hover:opacity-100 h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  duplicateWorkflow(wf.id)
                }}
                title="Duplicate workflow"
              >
                <IconCopy size={12} />
              </Button>

              {workflows.length > 1 && (
                <Button
                  size="xs"
                  variant="ghost"
                  className={cn(
                    'shrink-0 opacity-0 group-hover:opacity-100 h-5 w-5 p-0 text-muted-foreground hover:text-destructive',
                    workflows.length <= 1 && 'invisible',
                  )}
                  disabled={workflows.length <= 1}
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteWorkflow(wf.id)
                  }}
                  title="Delete workflow"
                >
                  <IconTrash size={12} />
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <div className="p-2 border-t flex flex-col gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={addWorkflow}
        >
          <IconPlus size={13} />
          New Workflow
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <IconUpload size={13} /> Import Workflow
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>
    </div>
  )
}
