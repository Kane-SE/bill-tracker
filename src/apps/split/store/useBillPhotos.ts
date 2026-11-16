import { useCallback, useEffect, useState } from 'react'
import { listPhotos, type BillPhoto } from '@/apps/split/lib/photoStore'

export type BillPhotoWithUrl = BillPhoto & { url: string }

/** A Nomnom's bill photos (oldest first) with object URLs that are revoked on change and unmount. */
export function useBillPhotos(nightId: string | undefined): {
  photos: BillPhotoWithUrl[]
  loading: boolean
  reload: () => void
} {
  const [photos, setPhotos] = useState<BillPhotoWithUrl[]>([])
  const [loading, setLoading] = useState(nightId !== undefined)
  const [tick, setTick] = useState(0)

  // Another Nomnom: drop the old list at once so it never shows under the new one.
  useEffect(() => {
    setPhotos([])
  }, [nightId])

  // Revoke a list's URLs only after a newer list has replaced it (or on unmount).
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos])

  useEffect(() => {
    if (!nightId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    listPhotos(nightId)
      .then((list) => {
        if (cancelled) return
        setPhotos(
          list.map((p) => ({ ...p, url: URL.createObjectURL(p.blob) })),
        )
      })
      .catch((e) => {
        console.error('Could not load bill photos', e)
        if (!cancelled) setPhotos([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [nightId, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { photos, loading, reload }
}
