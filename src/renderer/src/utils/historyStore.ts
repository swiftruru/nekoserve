import type { SimulationResult } from '../types'

// ──────────────────────────────────────────────────────────────
// historyStore — IndexedDB persistence for simulation history
// ──────────────────────────────────────────────────────────────

export interface PersistedHistoryEntry {
  id: number
  timestamp: number
  label: string
  result: SimulationResult
  pinned?: boolean
}

const DB_NAME = 'nekoserve'
const DB_VERSION = 1
const STORE_NAME = 'history'

/** FIFO cap: oldest unpinned entries are evicted once total exceeds this. */
export const HISTORY_CAP = 20

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)
}

export async function saveRun(
  result: SimulationResult,
  label: string,
): Promise<{ entry: PersistedHistoryEntry; evictedIds: number[] }> {
  const db = await openDB()
  const entry: Omit<PersistedHistoryEntry, 'id'> = {
    timestamp: Date.now(),
    label,
    result,
    pinned: false,
  }
  const saved = await new Promise<PersistedHistoryEntry>((resolve, reject) => {
    const req = tx(db, 'readwrite').add(entry)
    req.onsuccess = () => resolve({ ...entry, id: req.result as number })
    req.onerror = () => reject(req.error)
  })

  // Enforce FIFO cap: drop oldest unpinned entries until total ≤ HISTORY_CAP.
  // Pinned entries are never evicted automatically.
  const evictedIds: number[] = []
  const all = await loadAll()
  const overflow = all.length - HISTORY_CAP
  if (overflow > 0) {
    const candidates = all
      .filter((e) => !e.pinned && e.id !== saved.id)
      .sort((a, b) => a.timestamp - b.timestamp)
    for (const victim of candidates.slice(0, overflow)) {
      await deleteRun(victim.id).catch(() => {})
      evictedIds.push(victim.id)
    }
  }

  return { entry: saved, evictedIds }
}

export async function togglePin(id: number, pinned: boolean): Promise<void> {
  const db = await openDB()
  const store = tx(db, 'readwrite')
  return new Promise((resolve, reject) => {
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const entry = getReq.result as PersistedHistoryEntry | undefined
      if (!entry) { resolve(); return }
      entry.pinned = pinned
      const putReq = store.put(entry)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

export async function loadAll(): Promise<PersistedHistoryEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').getAll()
    req.onsuccess = () => resolve(req.result as PersistedHistoryEntry[])
    req.onerror = () => reject(req.error)
  })
}

export async function deleteRun(id: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function clearAll(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function updateLabel(id: number, label: string): Promise<void> {
  const db = await openDB()
  const store = tx(db, 'readwrite')
  return new Promise((resolve, reject) => {
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const entry = getReq.result as PersistedHistoryEntry | undefined
      if (!entry) { resolve(); return }
      entry.label = label
      const putReq = store.put(entry)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}
