import type { SimulationResult } from '../types'

// ──────────────────────────────────────────────────────────────
// historyStore — IndexedDB persistence for simulation history
// ──────────────────────────────────────────────────────────────

export interface PersistedHistoryEntry {
  id: number
  timestamp: number
  label: string
  result: SimulationResult
}

const DB_NAME = 'nekoserve'
const DB_VERSION = 1
const STORE_NAME = 'history'

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
): Promise<PersistedHistoryEntry> {
  const db = await openDB()
  const entry: Omit<PersistedHistoryEntry, 'id'> = {
    timestamp: Date.now(),
    label,
    result,
  }
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').add(entry)
    req.onsuccess = () =>
      resolve({ ...entry, id: req.result as number })
    req.onerror = () => reject(req.error)
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
