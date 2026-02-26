import { Suspense, useEffect, useMemo, useRef } from 'react'
import { OrbitControls, useGLTF, useTexture } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { IconPhoto } from '@tabler/icons-react'
import {
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import type { Group, Material, Texture } from 'three'
import type { Preview3DShape } from './types'

export function Preview3DView({
  dataUrl,
  shape,
  textureRepeat,
  customModelUrl,
  selectedMaterials,
}: {
  dataUrl: string | null
  shape: Preview3DShape
  textureRepeat: number
  customModelUrl?: string | null
  selectedMaterials?: Array<string>
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

function CustomModelMesh({
  dataUrl,
  modelUrl,
  textureRepeat,
  selectedMaterials,
}: {
  dataUrl: string
  modelUrl: string
  textureRepeat: number
  selectedMaterials: Array<string>
}) {
  const groupRef = useRef<Group | null>(null)
  const { scene } = useGLTF(modelUrl)
  const texture = useTexture(dataUrl, () => {
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(textureRepeat, textureRepeat)
    texture.needsUpdate = true
  })

  const { clonedScene, originalMaterials } = useMemo(() => {
    const clone = scene.clone(true)
    const originals = new Map<Mesh, Material | Array<Material>>()
    clone.traverse((child) => {
      if (child instanceof Mesh) {
        originals.set(
          child,
          Array.isArray(child.material)
            ? child.material.map((m) => m.clone())
            : child.material.clone(),
        )
      }
    })
    return { clonedScene: clone, originalMaterials: originals }
  }, [scene])

  useEffect(() => {
    const selectedSet = new Set(selectedMaterials)
    clonedScene.traverse((child) => {
      if (!(child instanceof Mesh)) return
      const mesh = child
      const origMat = originalMaterials.get(mesh)
      if (!origMat) return
      const originals = Array.isArray(origMat) ? origMat : [origMat]

      const newMaterials = originals.map((mat, i) => {
        const matName = mat.name || `Material ${i}`
        if (selectedSet.has(matName)) {
          const newMat = new MeshStandardMaterial()
          newMat.map = texture as Texture
          newMat.name = matName
          newMat.needsUpdate = true
          return newMat
        }
        return mat.clone()
      })

      mesh.material = Array.isArray(origMat) ? newMaterials : newMaterials[0]
    })
  }, [clonedScene, originalMaterials, texture, selectedMaterials])

  return (
    <group ref={groupRef} rotation={[0, 0, 0]}>
      <primitive object={clonedScene} />
    </group>
  )
}
