import { IconPhoto } from '@tabler/icons-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// PreviewView defines the available viewing modes.
// Extend this union to add future views (e.g. '3d', 'uv', 'normal-map').
export type PreviewView = 'image' | '3d'

interface PreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  dataUrl: string | null
  // activeView / onViewChange are wired up for future view-switching (3D, etc.)
  activeView?: PreviewView
  onViewChange?: (view: PreviewView) => void
}

export function PreviewModal({
  open,
  onOpenChange,
  title,
  dataUrl,
  activeView = 'image',
}: PreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-w-5xl flex-col gap-0 p-0 sm:max-w-5xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex flex-row items-center justify-between p-2">
          <DialogTitle className="text-sm font-semibold ml-2">
            {title}
          </DialogTitle>

          <div className="flex flex-row items-center gap-2">
            <ViewTab label="Image" active={activeView === 'image'} />
            <ViewTab label="3D" active={activeView === '3d'} />
          </div>
          <DialogClose />
        </DialogHeader>

        {/* Content area */}
        <div className="relative flex min-h-96 flex-1 items-center justify-center bg-muted/40 p-6">
          {activeView === 'image' && <ImageView dataUrl={dataUrl} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ViewTab({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={
        active
          ? 'rounded px-2 py-0.5 bg-muted text-foreground font-medium'
          : 'rounded px-2 py-0.5 text-muted-foreground'
      }
    >
      {label}
    </span>
  )
}

function ImageView({ dataUrl }: { dataUrl: string | null }) {
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
      className="max-h-[80vh] max-w-full object-contain"
    />
  )
}
