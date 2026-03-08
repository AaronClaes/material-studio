import { IconFolder, IconFolderOpen } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { supportsDirectoryPicker } from '@/shared/hooks/use-directory-picker'

interface DirectoryPickerButtonProps {
  handle: FileSystemDirectoryHandle | undefined
  onPick: () => void
  disabled?: boolean
}

export function DirectoryPickerButton({
  handle,
  onPick,
  disabled,
}: DirectoryPickerButtonProps) {
  if (!supportsDirectoryPicker) {
    return (
      <p className="text-xs text-muted-foreground">
        Not supported in this browser
      </p>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full h-7 justify-start gap-1.5 text-xs font-normal truncate"
      onClick={onPick}
      disabled={disabled}
    >
      {handle ? (
        <>
          <IconFolderOpen size={13} className="shrink-0" />
          <span className="truncate">{handle.name}</span>
        </>
      ) : (
        <>
          <IconFolder size={13} className="shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">Choose folder…</span>
        </>
      )}
    </Button>
  )
}
