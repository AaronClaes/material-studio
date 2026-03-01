import {
  createStorageBuffer,
  readBackAsFloat32,
  readBackAsUint8,
} from '../buffers'
import { runQuiltingSSD } from '../shaders/quilting-ssd'
import { runQuiltingComposite } from '../shaders/quilting-composite'
import type { GPUImageBuffer } from '@/features/workflow/types'

function makeXorshift32(seed: number) {
  let state = (seed >>> 0) || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return state >>> 0
  }
}

function computeLeftSeamMask(
  srcPixelData: Uint8ClampedArray,
  shadow: Uint8ClampedArray,
  srcW: number,
  outW: number,
  patch: number,
  overlap: number,
  outX: number,
  outY: number,
  chosenSrcX: number,
  chosenSrcY: number,
): Uint32Array {
  const cost = new Float32Array(patch * overlap)
  for (let y = 0; y < patch; y++) {
    for (let x = 0; x < overlap; x++) {
      const si = ((chosenSrcY + y) * srcW + (chosenSrcX + x)) * 4
      const ci = ((outY + y) * outW + (outX + x)) * 4
      const dr = (srcPixelData[si] ?? 0) - (shadow[ci] ?? 0)
      const dg = (srcPixelData[si + 1] ?? 0) - (shadow[ci + 1] ?? 0)
      const db = (srcPixelData[si + 2] ?? 0) - (shadow[ci + 2] ?? 0)
      cost[y * overlap + x] = dr * dr + dg * dg + db * db
    }
  }

  const dp = new Float32Array(patch * overlap)
  for (let x = 0; x < overlap; x++) {
    dp[x] = cost[x] ?? 0
  }
  for (let y = 1; y < patch; y++) {
    for (let x = 0; x < overlap; x++) {
      let best = dp[(y - 1) * overlap + x] ?? 0
      if (x > 0) best = Math.min(best, dp[(y - 1) * overlap + (x - 1)] ?? Infinity)
      if (x < overlap - 1)
        best = Math.min(best, dp[(y - 1) * overlap + (x + 1)] ?? Infinity)
      dp[y * overlap + x] = (cost[y * overlap + x] ?? 0) + best
    }
  }

  const seamCol = new Int32Array(patch)
  let minVal = Infinity
  let minX = 0
  for (let x = 0; x < overlap; x++) {
    if ((dp[(patch - 1) * overlap + x] ?? Infinity) < minVal) {
      minVal = dp[(patch - 1) * overlap + x] ?? minVal
      minX = x
    }
  }
  seamCol[patch - 1] = minX
  for (let y = patch - 2; y >= 0; y--) {
    const cx = seamCol[y + 1] ?? 0
    let bestX = cx
    let bestV = dp[y * overlap + cx] ?? Infinity
    if (cx > 0 && (dp[y * overlap + (cx - 1)] ?? Infinity) < bestV) {
      bestV = dp[y * overlap + (cx - 1)] ?? bestV
      bestX = cx - 1
    }
    if (cx < overlap - 1 && (dp[y * overlap + (cx + 1)] ?? Infinity) < bestV) {
      bestX = cx + 1
    }
    seamCol[y] = bestX
  }

  const mask = new Uint32Array(patch * patch)
  for (let y = 0; y < patch; y++) {
    for (let x = 0; x < patch; x++) {
      mask[y * patch + x] = x >= (seamCol[y] ?? 0) ? 1 : 0
    }
  }
  return mask
}

function computeTopSeamMask(
  srcPixelData: Uint8ClampedArray,
  shadow: Uint8ClampedArray,
  srcW: number,
  outW: number,
  patch: number,
  overlap: number,
  outX: number,
  outY: number,
  chosenSrcX: number,
  chosenSrcY: number,
): Uint32Array {
  // cost[y * patch + x] for y in [0, overlap), x in [0, patch)
  const cost = new Float32Array(overlap * patch)
  for (let y = 0; y < overlap; y++) {
    for (let x = 0; x < patch; x++) {
      const si = ((chosenSrcY + y) * srcW + (chosenSrcX + x)) * 4
      const ci = ((outY + y) * outW + (outX + x)) * 4
      const dr = (srcPixelData[si] ?? 0) - (shadow[ci] ?? 0)
      const dg = (srcPixelData[si + 1] ?? 0) - (shadow[ci + 1] ?? 0)
      const db = (srcPixelData[si + 2] ?? 0) - (shadow[ci + 2] ?? 0)
      cost[y * patch + x] = dr * dr + dg * dg + db * db
    }
  }

  // dp[x * overlap + y] = min cost to reach (x, y) along horizontal path
  const dp = new Float32Array(patch * overlap)
  for (let y = 0; y < overlap; y++) {
    dp[y] = cost[y * patch + 0] ?? 0
  }
  for (let x = 1; x < patch; x++) {
    for (let y = 0; y < overlap; y++) {
      let best = dp[(x - 1) * overlap + y] ?? 0
      if (y > 0) best = Math.min(best, dp[(x - 1) * overlap + (y - 1)] ?? Infinity)
      if (y < overlap - 1)
        best = Math.min(best, dp[(x - 1) * overlap + (y + 1)] ?? Infinity)
      dp[x * overlap + y] = (cost[y * patch + x] ?? 0) + best
    }
  }

  const seamRow = new Int32Array(patch)
  let minVal = Infinity
  let minY = 0
  for (let y = 0; y < overlap; y++) {
    if ((dp[(patch - 1) * overlap + y] ?? Infinity) < minVal) {
      minVal = dp[(patch - 1) * overlap + y] ?? minVal
      minY = y
    }
  }
  seamRow[patch - 1] = minY
  for (let x = patch - 2; x >= 0; x--) {
    const cy = seamRow[x + 1] ?? 0
    let bestY = cy
    let bestV = dp[x * overlap + cy] ?? Infinity
    if (cy > 0 && (dp[x * overlap + (cy - 1)] ?? Infinity) < bestV) {
      bestV = dp[x * overlap + (cy - 1)] ?? bestV
      bestY = cy - 1
    }
    if (cy < overlap - 1 && (dp[x * overlap + (cy + 1)] ?? Infinity) < bestV) {
      bestY = cy + 1
    }
    seamRow[x] = bestY
  }

  const mask = new Uint32Array(patch * patch)
  for (let y = 0; y < patch; y++) {
    for (let x = 0; x < patch; x++) {
      mask[y * patch + x] = y >= (seamRow[x] ?? 0) ? 1 : 0
    }
  }
  return mask
}

export async function processQuiltingNode(
  device: GPUDevice,
  input: GPUImageBuffer,
  params: {
    outputWidth: number
    outputHeight: number
    patchSize: number
    overlapFraction: number
    errorTolerance: number
    seed: number
  },
): Promise<GPUImageBuffer> {
  const { outputWidth: outW, outputHeight: outH, patchSize: patch } = params
  const overlap = Math.max(1, Math.round(patch * params.overlapFraction))
  const step = patch - overlap

  if (step <= 0) throw new Error('Patch size too small relative to overlap')
  if (input.width < patch)
    throw new Error('Source image too small for patch size (width)')
  if (input.height < patch)
    throw new Error('Source image too small for patch size (height)')

  const candCols = Math.floor((input.width - patch) / step) + 1
  const candRows = Math.floor((input.height - patch) / step) + 1
  if (candCols < 1 || candRows < 1) {
    throw new Error('No valid candidate patches in source image')
  }

  const blockCols = Math.ceil((outW - overlap) / step)
  const blockRows = Math.ceil((outH - overlap) / step)

  // Read input to CPU once for shadow updates and DP computations
  const srcPixelData = await readBackAsUint8(
    device,
    input.buffer,
    input.width * input.height * 4,
  )

  const canvasBuffer = createStorageBuffer(device, outW * outH * 4)
  const shadow = new Uint8ClampedArray(outW * outH * 4)

  const canvasImg: GPUImageBuffer = { buffer: canvasBuffer, width: outW, height: outH }
  const prng = makeXorshift32(params.seed)

  for (let blockRow = 0; blockRow < blockRows; blockRow++) {
    for (let blockCol = 0; blockCol < blockCols; blockCol++) {
      const outX = blockCol * step
      const outY = blockRow * step

      let chosenSrcX: number
      let chosenSrcY: number
      let seamMask: Uint32Array

      if (blockRow === 0 && blockCol === 0) {
        const idx = prng() % (candCols * candRows)
        chosenSrcX = (idx % candCols) * step
        chosenSrcY = Math.floor(idx / candCols) * step
        seamMask = new Uint32Array(patch * patch).fill(1)
      } else {
        const ssdBuf = runQuiltingSSD(device, input, canvasImg, {
          patchSize: patch,
          overlap,
          blockCol,
          blockRow,
          candCols,
          candRows,
        })

        const ssdValues = await readBackAsFloat32(
          device,
          ssdBuf,
          candCols * candRows * 4,
        )
        ssdBuf.destroy()

        let minSSD = Infinity
        for (const v of ssdValues) {
          if (v < minSSD) minSSD = v
        }

        const threshold = minSSD * params.errorTolerance
        const candidates: Array<number> = []
        for (let i = 0; i < ssdValues.length; i++) {
          if ((ssdValues[i] ?? Infinity) <= threshold) candidates.push(i)
        }

        const chosenIdx = candidates[prng() % candidates.length] ?? 0
        chosenSrcX = (chosenIdx % candCols) * step
        chosenSrcY = Math.floor(chosenIdx / candCols) * step

        const hasLeft = blockCol > 0
        const hasTop = blockRow > 0

        if (hasLeft && hasTop) {
          const leftMask = computeLeftSeamMask(
            srcPixelData,
            shadow,
            input.width,
            outW,
            patch,
            overlap,
            outX,
            outY,
            chosenSrcX,
            chosenSrcY,
          )
          const topMask = computeTopSeamMask(
            srcPixelData,
            shadow,
            input.width,
            outW,
            patch,
            overlap,
            outX,
            outY,
            chosenSrcX,
            chosenSrcY,
          )
          seamMask = new Uint32Array(patch * patch)
          for (let i = 0; i < patch * patch; i++) {
            seamMask[i] = (leftMask[i] ?? 0) | (topMask[i] ?? 0)
          }
        } else if (hasLeft) {
          seamMask = computeLeftSeamMask(
            srcPixelData,
            shadow,
            input.width,
            outW,
            patch,
            overlap,
            outX,
            outY,
            chosenSrcX,
            chosenSrcY,
          )
        } else {
          seamMask = computeTopSeamMask(
            srcPixelData,
            shadow,
            input.width,
            outW,
            patch,
            overlap,
            outX,
            outY,
            chosenSrcX,
            chosenSrcY,
          )
        }
      }

      // Upload seam mask to GPU
      const seamMaskBuf = device.createBuffer({
        size: patch * patch * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true,
      })
      new Uint32Array(seamMaskBuf.getMappedRange()).set(seamMask)
      seamMaskBuf.unmap()

      runQuiltingComposite(device, input, canvasBuffer, seamMaskBuf, {
        outWidth: outW,
        outHeight: outH,
        srcWidth: input.width,
        patchSize: patch,
        blockOutX: outX,
        blockOutY: outY,
        patchSrcX: chosenSrcX,
        patchSrcY: chosenSrcY,
      })
      seamMaskBuf.destroy()

      // Update CPU shadow copy
      for (let py = 0; py < patch; py++) {
        for (let px = 0; px < patch; px++) {
          const cx = outX + px
          const cy = outY + py
          if (cx >= outW || cy >= outH) continue
          if (seamMask[py * patch + px] === 1) {
            const shadowOff = (cy * outW + cx) * 4
            const srcOff =
              ((chosenSrcY + py) * input.width + (chosenSrcX + px)) * 4
            shadow[shadowOff] = srcPixelData[srcOff] ?? 0
            shadow[shadowOff + 1] = srcPixelData[srcOff + 1] ?? 0
            shadow[shadowOff + 2] = srcPixelData[srcOff + 2] ?? 0
            shadow[shadowOff + 3] = srcPixelData[srcOff + 3] ?? 0
          }
        }
      }
    }
  }

  return { buffer: canvasBuffer, width: outW, height: outH }
}
