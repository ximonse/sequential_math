/**
 * Persistent retry queue for cloud sync.
 *
 * Keeps a Set<studentId> in localStorage so pending syncs survive
 * page refreshes and tab kills. Schedules retries with exponential
 * backoff within the current session.
 */

const PENDING_SYNC_KEY = 'mathapp_pending_cloud_sync'
const RETRY_DELAYS_MS = [5_000, 15_000, 45_000, 120_000, 300_000, 300_000, 300_000, 300_000]
const MAX_RETRIES_PER_SESSION = RETRY_DELAYS_MS.length

// ── Persistent queue (localStorage) ──────────────────────────────────────────

function readPendingSet() {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writePendingSet(set) {
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify([...set]))
}

export function getPendingSyncIds() {
  return [...readPendingSet()]
}

export function hasPendingSyncs() {
  return readPendingSet().size > 0
}

export function addPendingSync(studentId) {
  const set = readPendingSet()
  set.add(studentId)
  writePendingSet(set)
}

export function removePendingSync(studentId) {
  const set = readPendingSet()
  set.delete(studentId)
  writePendingSet(set)
}

// ── In-memory retry scheduling ───────────────────────────────────────────────

const retryState = new Map()

function getRetryEntry(studentId) {
  if (!retryState.has(studentId)) {
    retryState.set(studentId, { attempts: 0, timer: null })
  }
  return retryState.get(studentId)
}

/**
 * Schedule an exponential-backoff retry for a failed sync.
 * @param {string} studentId
 * @param {(id: string) => Promise<boolean>} syncFn — return true on success
 */
export function scheduleRetry(studentId, syncFn) {
  const entry = getRetryEntry(studentId)
  if (entry.attempts >= MAX_RETRIES_PER_SESSION) return
  if (entry.timer) clearTimeout(entry.timer)

  const delay = RETRY_DELAYS_MS[entry.attempts] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]
  entry.attempts++
  entry.timer = setTimeout(async () => {
    entry.timer = null
    try {
      const ok = await syncFn(studentId)
      if (ok) {
        removePendingSync(studentId)
        entry.attempts = 0
      } else {
        scheduleRetry(studentId, syncFn)
      }
    } catch {
      scheduleRetry(studentId, syncFn)
    }
  }, delay)
}

export function cancelRetries(studentId) {
  const entry = retryState.get(studentId)
  if (!entry) return
  if (entry.timer) clearTimeout(entry.timer)
  retryState.delete(studentId)
}

export function cancelAllRetries() {
  for (const [, entry] of retryState) {
    if (entry.timer) clearTimeout(entry.timer)
  }
  retryState.clear()
}
