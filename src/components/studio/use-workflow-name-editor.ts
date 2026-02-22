import { useRef, useState } from 'react'

interface UseWorkflowNameEditorOptions {
  onCommitName: (workflowId: string, name: string) => void
}

export function useWorkflowNameEditor({
  onCommitName,
}: UseWorkflowNameEditorOptions) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit(id: string, currentName: string) {
    setEditingId(id)
    setEditValue(currentName)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    if (editingId && editValue.trim()) {
      onCommitName(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  return {
    editingId,
    editValue,
    setEditValue,
    inputRef,
    startEdit,
    commitEdit,
    cancelEdit,
    handleKeyDown,
  }
}
