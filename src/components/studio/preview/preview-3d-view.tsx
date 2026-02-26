import { Suspense, useEffect, useRef } from 'react'
import { OrbitControls, useTexture } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { IconPhoto } from '@tabler/icons-react'
import { DoubleSide, RepeatWrapping, SRGBColorSpace } from 'three'
import type { Mesh } from 'three'
import type { Preview3DShape } from './types'

export function Preview3DView({
  dataUrl,
  shape,
  textureRepeat,
}: {
  dataUrl: string | null
  shape: Preview3DShape
  textureRepeat: number
}) {
  if (!dataUrl) {
    return (
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <IconPhoto size={48} className="opacity-30" />
        <span className="text-xs">No output yet</span>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden border border-border/60 bg-background/60">
      <Canvas camera={{ position: [0, 0, 3.3], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 3, 2]} intensity={1.2} />
        <directionalLight position={[-2.5, -2.5, -1.5]} intensity={0.5} />
        <Suspense fallback={null}>
          <TexturedMesh
            dataUrl={dataUrl}
            shape={shape}
            textureRepeat={textureRepeat}
          />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={1.8} maxDistance={5} />
      </Canvas>
    </div>
  )
}

function TexturedMesh({
  dataUrl,
  shape,
  textureRepeat,
}: {
  dataUrl: string
  shape: Preview3DShape
  textureRepeat: number
}) {
  const meshRef = useRef<Mesh | null>(null)
  const texture = useTexture(dataUrl)

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(textureRepeat, textureRepeat)
    texture.needsUpdate = true
  }, [texture, textureRepeat])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.2
  })

  return (
    <mesh
      ref={meshRef}
      rotation={[
        shape === 'plane' ? 0 : -0.12,
        0.3,
        shape === 'plane' ? 0 : 0.05,
      ]}
    >
      {shape === 'sphere' && <sphereGeometry args={[1.1, 64, 64]} />}
      {shape === 'cube' && <boxGeometry args={[1.7, 1.7, 1.7]} />}
      {shape === 'plane' && <planeGeometry args={[2.6, 2.6]} />}
      <meshStandardMaterial
        map={texture}
        side={shape === 'plane' ? DoubleSide : undefined}
      />
    </mesh>
  )
}
