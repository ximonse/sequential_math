/**
 * Write-Ahead Log (WAL) för sync.
 * Varje händelse (problem_result, mastery_achieved, etc.) sparas som
 * en immutable entry i localStorage. Entries skickas till servern och
 * markeras som synkade. Synkade entries prunas efter maxAge.
 *
 * Nycklar i localStorage: mathapp_wal_{studentId}
 * Max 500 entries per elev.
 */

const WAL_PREFIX = 'mathapp_wal_'
const MAX_WAL_ENTRIES = 500

function getWalKey(studentId) {
  return WAL_PREFIX + studentId
}

function readWal(studentId) {
  try {
    const raw = localStorage.getItem(getWalKey(studentId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeWal(studentId, entries) {
  try {
    localStorage.setItem(getWalKey(studentId), JSON.stringify(entries))
  } catch {
    // localStorage full — best effort
  }
}

/**
 * Skapa en WAL-entry med unikt id.
 * @param {string} type - 'problem_result' | 'mastery_achieved' | 'table_completed' | 'difficulty_adjusted'
 * @param {string} studentId
 * @param {object} payload - event-specifik data
 */
export function createWalEntry(type, studentId, payload) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return {
    id: `wal_${timestamp}_${random}`,
    type,
    studentId,
    timestamp,
    payload,
    syncedAt: null
  }
}

/**
 * Lägg till en entry i WAL:en.
 * Prunar automatiskt om > MAX_WAL_ENTRIES.
 */
export function appendToWal(entry) {
  if (!entry?.studentId) return
  const entries = readWal(entry.studentId)
  entries.push(entry)

  // Pruna: behåll osynkade + senaste synkade upp till MAX
  if (entries.length > MAX_WAL_ENTRIES) {
    const unsynced = entries.filter(e => !e.syncedAt)
    const synced = entries.filter(e => e.syncedAt).slice(-Math.max(0, MAX_WAL_ENTRIES - unsynced.length))
    writeWal(entry.studentId, [...synced, ...unsynced])
    return
  }

  writeWal(entry.studentId, entries)
}

/**
 * Hämta alla osynkade entries för en elev.
 */
export function getUnsynced(studentId) {
  return readWal(studentId).filter(e => !e.syncedAt)
}

/**
 * Markera entries som synkade (efter server-ack).
 */
export function markSynced(studentId, entryIds) {
  if (!entryIds || entryIds.length === 0) return
  const idSet = new Set(entryIds)
  const entries = readWal(studentId)
  const now = Date.now()
  let changed = false
  for (const entry of entries) {
    if (idSet.has(entry.id) && !entry.syncedAt) {
      entry.syncedAt = now
      changed = true
    }
  }
  if (changed) writeWal(studentId, entries)
}

/**
 * Antal osynkade entries.
 */
export function getWalSize(studentId) {
  return getUnsynced(studentId).length
}

/**
 * Ta bort synkade entries äldre än maxAge (ms).
 * Default: 24 timmar.
 */
export function pruneWal(studentId, maxAge = 24 * 60 * 60 * 1000) {
  const entries = readWal(studentId)
  const cutoff = Date.now() - maxAge
  const kept = entries.filter(e => !e.syncedAt || e.syncedAt > cutoff)
  if (kept.length < entries.length) {
    writeWal(studentId, kept)
  }
}
