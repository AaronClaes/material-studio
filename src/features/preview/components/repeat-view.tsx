import { ImageView } from './image-view'
import { RepeatTileGrid } from './repeat-tile-grid'

export function RepeatView({
  dataUrl,
  repeatAmount,
  showGrid,
}: {
  dataUrl: string | null
  repeatAmount: number
  showGrid: boolean
}) {
  if (!dataUrl) return <ImageView dataUrl={null} />

  return (
    <RepeatTileGrid
      dataUrl={dataUrl}
      repeatAmount={repeatAmount}
      showGrid={showGrid}
      className="h-full w-full"
    />
  )
}
