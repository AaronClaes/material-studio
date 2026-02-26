import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export function RepeatTileGrid({
  dataUrl,
  repeatAmount,
  showGrid,
  className,
  style,
}: {
  dataUrl: string
  repeatAmount: number
  showGrid: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    let cancelled = false
    let currentImg: HTMLImageElement | null = null

    function draw(img: HTMLImageElement) {
      if (cancelled || !canvas) return
      const cW = container!.clientWidth
      const cH = container!.clientHeight
      if (cW <= 0 || cH <= 0) return

      const scale = Math.min(
        cW / (repeatAmount * img.naturalWidth),
        cH / (repeatAmount * img.naturalHeight),
      )
      const tileW = img.naturalWidth * scale
      const tileH = img.naturalHeight * scale
      const cssW = Math.round(tileW * repeatAmount)
      const cssH = Math.round(tileH * repeatAmount)

      const dpr = window.devicePixelRatio
      canvas.width = cssW * dpr
      canvas.height = cssH * dpr
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`

      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)

      for (let row = 0; row < repeatAmount; row++) {
        const ty = Math.round(row * tileH)
        const th = Math.round((row + 1) * tileH) - ty
        for (let col = 0; col < repeatAmount; col++) {
          const tx = Math.round(col * tileW)
          const tw = Math.round((col + 1) * tileW) - tx
          ctx.drawImage(img, tx, ty, tw, th)
        }
      }

      if (showGrid) {
        ctx.save()
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)'
        ctx.lineWidth = 2
        for (let col = 1; col < repeatAmount; col++) {
          const x = Math.round(col * tileW) + 0.5
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, cssH)
          ctx.stroke()
        }
        for (let row = 1; row < repeatAmount; row++) {
          const y = Math.round(row * tileH) + 0.5
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(cssW, y)
          ctx.stroke()
        }
        ctx.restore()
      }
    }

    const img = new Image()
    img.onload = () => {
      currentImg = img
      draw(img)
    }
    img.src = dataUrl

    const observer = new ResizeObserver(() => {
      if (currentImg) draw(currentImg)
    })
    observer.observe(container)

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [dataUrl, repeatAmount, showGrid])

  return (
    <div
      ref={containerRef}
      className={cn('flex items-center justify-center', className)}
      style={style}
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
