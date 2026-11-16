/** Scale (width, height) down so the long edge is at most `max`. Never upscales. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const long = Math.max(width, height)
  if (long <= max) return { width: Math.round(width), height: Math.round(height) }
  const k = max / long
  return { width: Math.round(width * k), height: Math.round(height * k) }
}

/** Decode an image file, shrink it to `max` px on the long edge and re-encode as JPEG. Rejects if it can't be decoded. */
export async function downscaleToJpeg(
  file: Blob,
  max = 1600,
  quality = 0.8,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, max)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')
    ctx.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('Could not encode the image')
    return { blob, width, height }
  } finally {
    bitmap.close()
  }
}
