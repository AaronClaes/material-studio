import { Suspense, useRef } from 'react'
import { OrbitControls, View } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { IconPhoto } from '@tabler/icons-react'
import {
  CustomModelMesh,
  DeferredEnvironment,
  TexturedMesh,
} from './preview-3d-view'
import type { RefObject } from 'react'
import type { Preview3DShape } from '../types'

export interface Split3DViewProps {
  leftDataUrl: string | null
  rightDataUrl: string | null
  leftLabel: string
  rightLabel: string
  shape: Preview3DShape
  textureRepeat: number
  customModelUrl?: string | null
  selectedMaterials?: Array<string>
  environmentFile?: string
}

function ViewContent({
  dataUrl,
  shape,
  textureRepeat,
  customModelUrl,
  selectedMaterials,
  environmentFile,
}: {
  dataUrl: string | null
  shape: Preview3DShape
  textureRepeat: number
  customModelUrl?: string | null
  selectedMaterials?: Array<string>
  environmentFile?: string
}) {
  if (!dataUrl) return null

  return (
    <Suspense fallback={null}>
      <DeferredEnvironment file={environmentFile ?? '/hdri/sky-env.jpg'} />
      {shape === 'custom' && customModelUrl ? (
        <CustomModelMesh
          dataUrl={dataUrl}
          modelUrl={customModelUrl}
          textureRepeat={textureRepeat}
          selectedMaterials={selectedMaterials ?? []}
        />
      ) : (
        <TexturedMesh
          dataUrl={dataUrl}
          shape={shape}
          textureRepeat={textureRepeat}
        />
      )}
      <OrbitControls makeDefault />
    </Suspense>
  )
}

export function Split3DView({
  leftDataUrl,
  rightDataUrl,
  leftLabel,
  rightLabel,
  shape,
  textureRepeat,
  customModelUrl,
  selectedMaterials,
  environmentFile,
}: Split3DViewProps) {
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex h-full w-full">
      {/* Left viewport DOM container */}
      <div
        ref={leftRef}
        className="relative flex flex-1 border-r border-border overflow-hidden"
      >
        {!leftDataUrl && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <IconPhoto size={48} className="opacity-30" />
            <span className="text-xs">No output yet</span>
          </div>
        )}
        <span className="absolute bottom-2 left-2 border border-border/50 bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground backdrop-blur-sm z-10">
          {leftLabel}
        </span>
      </div>

      {/* Right viewport DOM container */}
      <div ref={rightRef} className="relative flex flex-1 overflow-hidden">
        {!rightDataUrl && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <IconPhoto size={48} className="opacity-30" />
            <span className="text-xs">No output yet</span>
          </div>
        )}
        <span className="absolute bottom-2 right-2 border border-border/50 bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground backdrop-blur-sm z-10">
          {rightLabel} (current)
        </span>
      </div>

      {/* Single shared canvas renders both views */}
      <Canvas
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
        }}
        eventSource={document.body}
        camera={{ position: [0, 0, 3.3], fov: 45 }}
        dpr={[1, 2]}
      >
        <View track={leftRef as RefObject<HTMLElement>}>
          <ViewContent
            dataUrl={leftDataUrl}
            shape={shape}
            textureRepeat={textureRepeat}
            customModelUrl={customModelUrl}
            selectedMaterials={selectedMaterials}
            environmentFile={environmentFile}
          />
        </View>
        <View track={rightRef as RefObject<HTMLElement>}>
          <ViewContent
            dataUrl={rightDataUrl}
            shape={shape}
            textureRepeat={textureRepeat}
            customModelUrl={customModelUrl}
            selectedMaterials={selectedMaterials}
            environmentFile={environmentFile}
          />
        </View>
        <View.Port />
      </Canvas>
    </div>
  )
}
