/**
 * offlineQueue.ts — durable queue for diagnoses captured without a network
 *
 * The problem this solves is specific. A farmer walks into a field, sees
 * something wrong with a crop, and photographs it. That is exactly the moment
 * they are least likely to have signal — and exactly the moment the observation
 * matters most. Losing it means they either walk back later or give up.
 *
 * So the capture path never depends on connectivity: the photo goes into
 * IndexedDB immediately, and the analysis request is replayed when a network
 * returns. IndexedDB rather than localStorage because these are base64 images —
 * localStorage would blow its 5MB quota after a handful of them.
 */

const DB_NAME = "kisan-offline";
const DB_VERSION = 1;
const STORE = "diagnoses";

export type QueueStatus = "pending" | "syncing" | "failed";

export interface QueuedDiagnosis {
  id: string;
  /** Data URI of the captured frame. */
  image: string;
  /** Which analysis the farmer asked for. */
  kind: "crop" | "soil" | "thermal" | "field";
  /** Free-text note the farmer added, if any. */
  note?: string;
  /** Where it was taken, when the device would give us a fix. */
  location?: { lat: number; lon: number };
  capturedAt: number;
  status: QueueStatus;
  attempts: number;
  lastError?: string;
}

// ── IndexedDB plumbing ────────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("capturedAt", "capturedAt");
        store.createIndex("status", "status");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = fn(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function enqueue(
  entry: Omit<QueuedDiagnosis, "id" | "capturedAt" | "status" | "attempts">,
): Promise<QueuedDiagnosis> {
  const record: QueuedDiagnosis = {
    ...entry,
    id: `dx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    capturedAt: Date.now(),
    status: "pending",
    attempts: 0,
  };
  await tx("readwrite", (s) => s.add(record));
  notify();
  return record;
}

export async function listQueue(): Promise<QueuedDiagnosis[]> {
  const all = await tx<QueuedDiagnosis[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => b.capturedAt - a.capturedAt);
}

export async function countQueue(): Promise<number> {
  try {
    return await tx<number>("readonly", (s) => s.count());
  } catch {
    return 0;
  }
}

export async function remove(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
  notify();
}

export async function update(
  id: string,
  patch: Partial<QueuedDiagnosis>,
): Promise<void> {
  const existing = await tx<QueuedDiagnosis | undefined>("readonly", (s) => s.get(id));
  if (!existing) return;
  await tx("readwrite", (s) => s.put({ ...existing, ...patch }));
  notify();
}

export async function clearQueue(): Promise<void> {
  await tx("readwrite", (s) => s.clear());
  notify();
}

// ── Change notification ───────────────────────────────────────────────────────
// A tiny event bus so any component can reflect the queue without polling.

const CHANGE_EVENT = "kisan:queue-changed";

function notify() {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function onQueueChange(fn: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

// ── Replay ────────────────────────────────────────────────────────────────────

/**
 * Replays every pending capture against the supplied analyser.
 *
 * The analyser is injected rather than imported so this module stays free of
 * any dependency on a particular AI service — the queue does not care what
 * eventually processes the image.
 *
 * Entries that fail are kept, not dropped: after three attempts they are marked
 * failed and surfaced to the farmer rather than silently disappearing.
 */
export async function flushQueue(
  analyse: (entry: QueuedDiagnosis) => Promise<void>,
  opts: { maxAttempts?: number } = {},
): Promise<{ synced: number; failed: number }> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const pending = (await listQueue()).filter((e) => e.status !== "syncing");

  let synced = 0;
  let failed = 0;

  for (const entry of pending) {
    if (entry.attempts >= maxAttempts) {
      failed += 1;
      continue;
    }

    await update(entry.id, { status: "syncing" });
    try {
      await analyse(entry);
      await remove(entry.id);
      synced += 1;
    } catch (err) {
      const attempts = entry.attempts + 1;
      await update(entry.id, {
        status: attempts >= maxAttempts ? "failed" : "pending",
        attempts,
        lastError: err instanceof Error ? err.message : String(err),
      });
      failed += 1;
    }
  }

  return { synced, failed };
}
