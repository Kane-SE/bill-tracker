import { uid } from '@/shared/lib/utils'

export interface BillPhoto {
  id: string
  nightId: string
  /** image/jpeg, long edge <= 1600px */
  blob: Blob
  width: number
  height: number
  createdAt: string
  payer?: string
  total?: number
  thousands?: boolean
}

const DB_NAME = 'nook-split'
const STORE = 'billPhotos'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  const p = new Promise<IDBDatabase>((resolve, reject) => {
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, 1)
    } catch (e) {
      reject(e)
      return
    }
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id' })
      store.createIndex('nightId', 'nightId', { unique: false })
    }
    req.onsuccess = () => {
      const db = req.result
      // The browser dropped the connection, or another tab wants to upgrade: forget it so the next call reopens.
      const forget = () => {
        if (dbPromise === p) dbPromise = null
      }
      db.onclose = forget
      db.onversionchange = () => {
        forget()
        db.close()
      }
      resolve(db)
    }
    req.onerror = () => reject(req.error ?? new Error('Could not open the photo database'))
    req.onblocked = () => reject(new Error('The photo database is blocked'))
  })
  dbPromise = p
  // Let a later call retry after a failure.
  p.catch(() => {
    if (dbPromise === p) dbPromise = null
  })
  return p
}

/** Run `work` inside one transaction; resolve with its result once the transaction completes. */
async function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore, setResult: (v: T) => void) => void,
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    let result: T
    work(tx.objectStore(STORE), (v) => {
      result = v
    })
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error ?? new Error('Photo database error'))
    tx.onabort = () => reject(tx.error ?? new Error('Photo database transaction aborted'))
  })
}

export function savePhoto(p: Omit<BillPhoto, 'id' | 'createdAt'>): Promise<BillPhoto> {
  const photo: BillPhoto = { ...p, id: uid(), createdAt: new Date().toISOString() }
  return run<BillPhoto>('readwrite', (store, set) => {
    store.put(photo)
    set(photo)
  })
}

export function getPhoto(id: string): Promise<BillPhoto | undefined> {
  return run<BillPhoto | undefined>('readonly', (store, set) => {
    const req = store.get(id)
    req.onsuccess = () => set(req.result as BillPhoto | undefined)
  })
}

/** Oldest first. */
export function listPhotos(nightId: string): Promise<BillPhoto[]> {
  return run<BillPhoto[]>('readonly', (store, set) => {
    const req = store.index('nightId').getAll(nightId)
    req.onsuccess = () => {
      const all = req.result as BillPhoto[]
      set([...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
    }
  })
}

export function updatePhoto(id: string, patch: Pick<BillPhoto, 'payer' | 'total' | 'thousands'>): Promise<void> {
  return run<void>('readwrite', (store) => {
    const req = store.get(id)
    req.onsuccess = () => {
      const current = req.result as BillPhoto | undefined
      if (!current) return
      store.put({ ...current, ...patch })
    }
  })
}

export function deletePhoto(id: string): Promise<void> {
  return run<void>('readwrite', (store) => {
    store.delete(id)
  })
}

export function deletePhotosForNight(nightId: string): Promise<void> {
  return run<void>('readwrite', (store) => {
    const req = store.index('nightId').openCursor(IDBKeyRange.only(nightId))
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) return
      cursor.delete()
      cursor.continue()
    }
  })
}

/** Remove photos whose Nomnom is not in `nightIds`. Returns how many were removed. */
export function sweepOrphanPhotos(nightIds: string[]): Promise<number> {
  const keep = new Set(nightIds)
  let removed = 0
  return run<number>('readwrite', (store, set) => {
    const req = store.openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) {
        set(removed)
        return
      }
      if (!keep.has((cursor.value as BillPhoto).nightId)) {
        cursor.delete()
        removed++
      }
      cursor.continue()
    }
  })
}

let persistRequested = false

/** Ask the browser not to evict our storage. Once per session, best effort (#25). */
export function requestPersistentStorage(): void {
  if (persistRequested) return
  persistRequested = true
  try {
    void navigator.storage?.persist?.()?.catch(() => {})
  } catch {
    // best effort
  }
}
