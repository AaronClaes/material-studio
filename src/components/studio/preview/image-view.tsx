import { IconPhoto } from '@tabler/icons-react'

export function ImageView({ dataUrl }: { dataUrl: string | null }) {
  if (!dataUrl) {
    return (
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <IconPhoto size={48} className="opacity-30" />
        <span className="text-xs">No output yet</span>
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt="Full preview"
      className="max-h-full max-w-full object-contain"
    />
  )
}
