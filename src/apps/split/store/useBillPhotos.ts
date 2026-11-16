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

  useEffect(() => {
    if (!nightId) {
      setPhotos([])
      setLoading(false)
      return
    }
    let cancelled = false
    const urls: string[] = []
    setLoading(true)
    listPhotos(nightId)
      .then((list) => {
        if (cancelled) return
        setPhotos(
          list.map((p) => {
            const url = URL.createObjectURL(p.blob)
            urls.push(url)
            return { ...p, url }
          }),
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
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [nightId, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { photos, loading, reload }
}
