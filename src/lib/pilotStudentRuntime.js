import {
  fetchStudentSessionProfile,
  postStudentSessionEvents,
  resumeStudentSession
} from './studentSessionClient'
import { createPilotStudentStore } from './pilotStudentStore'
import { EVENT_OWNED_ADAPTIVE_FIELDS } from './pilotCheckpointContract.js'

const CHECKPOINT_FIELDS = ['currentDifficulty', 'highestDifficulty', 'adaptive', 'operationAbilities', 'assignmentProgress', 'stats', 'telemetry', 'activity']

export function normalizePilotStudentId(value) {
  const id = String(value || '').trim().toUpperCase()
  // Match the server-side student reference contract. Older QR cards used
  // 32-character hex IDs, while named seats use normalized name-based IDs.
  return /^[A-Z0-9ÅÄÖ_]{3,100}$/u.test(id) ? id : ''
}

function randomEventId() {
  if (typeof crypto?.randomUUID === 'function') return `pilot_${crypto.randomUUID()}`
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return `pilot_${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`
}

const MAX_BATCH_EVENTS = 100
// Stay clear of the server's 256 kB batch ceiling; checkpoints carry stats.
const MAX_BATCH_BYTES = 180 * 1024
const MAX_SERVER_EVENT_BYTES = 32 * 1024
const MAX_SAFE_EVENT_BYTES = 30 * 1024
const UNSENDABLE_STATUSES = new Set([400, 413])

function eventBytes(event) {
  try { return new TextEncoder().encode(JSON.stringify(event)).length } catch { return Number.POSITIVE_INFINITY }
}

export function buildBatches(events, maxEvents = MAX_BATCH_EVENTS, maxBytes = MAX_BATCH_BYTES) {
  const batches = []
  let batch = []
  let bytes = 0
  for (const event of events) {
    const size = eventBytes(event)
    if (batch.length > 0 && (batch.length >= maxEvents || bytes + size > maxBytes)) {
      batches.push(batch)
      batch = []
      bytes = 0
    }
    batch.push(event)
    bytes += size
  }
  if (batch.length > 0) batches.push(batch)
  return batches
}

function checkpointPayload(profile, capturedAt) {
  const payload = { capturedAt }
  for (const field of CHECKPOINT_FIELDS) {
    if (profile?.[field] !== undefined) payload[field] = structuredClone(profile[field])
  }
  return payload
}

// Diagnostic histories can exceed the per-event limit independently of each
// other. Keep ability state, results and daily aggregates intact.
export function compactCheckpointEvent(event) {
  if (event?.type !== 'profile_checkpoint') return event
  const compacted = structuredClone(event)
  for (const field of EVENT_OWNED_ADAPTIVE_FIELDS) {
    if (compacted.payload?.adaptive) delete compacted.payload.adaptive[field]
  }
  const histories = [
    [compacted.payload?.telemetry, 'events'],
    [compacted.payload?.adaptive, 'recentSelections']
  ]
  for (const [owner, field] of histories) {
    while (Array.isArray(owner?.[field]) && owner[field].length > 0 && eventBytes(compacted) > MAX_SAFE_EVENT_BYTES) {
      owner[field] = owner[field].slice(Math.max(1, Math.ceil(owner[field].length / 2)))
    }
  }
  return compacted
}

function prepareEvent(event) {
  const payload = event?.payload
  // Old non-arithmetic generators omitted problem IDs. The immutable vault
  // event ID gives the original answer a stable identity across every retry.
  // Keep observation IDs unchanged because mastery facts can reference them.
  if (event?.type === 'problem_result' && !payload?.problemId
    && typeof event.id === 'string' && event.id
    && Number.isFinite(payload?.timestamp) && payload.timestamp > 0
    && typeof payload.correct === 'boolean') {
    return { ...event, payload: { ...payload, problemId: `recovered_${event.id}` } }
  }
  return compactCheckpointEvent(event)
}

export function createPilotStudentRuntime({
  createStore = createPilotStudentStore,
  resumeSession = resumeStudentSession,
  fetchProfile = fetchStudentSessionProfile,
  postEvents = postStudentSessionEvents,
  makeEventId = randomEventId
} = {}) {
  let studentId = ''
  let store = null
  let recoveryAttempted = false
  const listeners = new Set()
  let syncStatus = {
    state: 'idle',
    pendingCount: 0,
    rejectedCount: 0,
    lastAttemptAt: 0,
    lastSuccessAt: 0,
    lastErrorAt: 0,
    lastError: ''
  }

  function updateSyncStatus(patch) {
    syncStatus = { ...syncStatus, ...patch }
    for (const listener of listeners) {
      try { listener({ ...syncStatus }) } catch { /* UI listeners must not break persistence */ }
    }
  }

  // Bisect failed batches: one obsolete entry must not cause 100 sequential
  // requests during login. Preserve every rejected encrypted original.
  async function sendApart(batch) {
    const midpoint = Math.ceil(batch.length / 2)
    const parts = batch.length === 1 ? [batch] : [batch.slice(0, midpoint), batch.slice(midpoint)]
    for (const part of parts) {
      let single
      try {
        single = await postEvents(part)
      } catch (error) {
        return { ok: false, error: String(error?.message || 'Kunde inte kontakta servern.') }
      }
      if (single?.ok) {
        if (!Array.isArray(single.ack) || !part.every(event => single.ack.includes(event.id))) {
          return { ok: false, error: 'Servern bekräftade inte elevsvaret.' }
        }
        await store.acknowledgeEvents(part.map(event => event.id))
      } else if (UNSENDABLE_STATUSES.has(single?.status)) {
        if (part.length === 1) await store.rejectEvents([part[0].id])
        else {
          const outcome = await sendApart(part)
          if (!outcome.ok) return outcome
        }
      } else {
        return { ok: false, error: String(single?.error || 'Kunde inte synka arbetet.') }
      }
    }
    return { ok: true }
  }

  async function reportCompletedSync() {
    const rejectedCount = await store.countRejectedEvents()
    updateSyncStatus({
      state: rejectedCount ? 'rejected' : 'synced',
      pendingCount: 0,
      rejectedCount,
      lastSuccessAt: Date.now(),
      lastErrorAt: rejectedCount ? Date.now() : 0,
      lastError: rejectedCount ? 'Ett eller flera svar avvisades av servern och finns kvar på enheten. Be läraren om hjälp.' : ''
    })
    return { ok: true }
  }

  async function recoverRejectedEvents() {
    let rejected
    try { rejected = await store.listRejectedEvents() } catch { return }
    const repairedResults = rejected
      .filter(item => item.event?.type === 'problem_result')
      .map(item => ({ original: item.event, repaired: prepareEvent(item.event) }))
      .filter(item => item.repaired !== item.original && eventBytes(item.repaired) <= MAX_SERVER_EVENT_BYTES)
      .map(item => item.repaired)
    for (const batch of buildBatches(repairedResults)) {
      let result
      try { result = await postEvents(batch) } catch { return }
      if (result?.ok) {
        const submitted = new Set(batch.map(event => event.id))
        const ack = (Array.isArray(result.ack) ? result.ack : []).filter(id => submitted.has(id))
        await store.acknowledgeEvents(ack)
        if (new Set(ack).size !== batch.length) return
      } else if (UNSENDABLE_STATUSES.has(result?.status)) {
        if (!(await sendApart(batch)).ok) return
      } else return
    }
    const checkpoints = rejected.filter(item => item.event?.type === 'profile_checkpoint')
    if (checkpoints.length === 0) return
    const latest = checkpoints.reduce((best, item) =>
      !best || Number(item.event.payload?.capturedAt || 0) > Number(best.event.payload?.capturedAt || 0) ? item : best, null)
    const repaired = compactCheckpointEvent(latest.event)
    if (eventBytes(repaired) > MAX_SERVER_EVENT_BYTES) return
    let result
    try { result = await postEvents([repaired]) } catch { return }
    if (!result?.ok || !Array.isArray(result.ack) || !result.ack.includes(repaired.id)) return
    await store.acknowledgeEvents([repaired.id])
    const olderIds = checkpoints.filter(item => item.event.id !== repaired.id).map(item => item.event.id)
    if (olderIds.length > 0) await store.supersedeRejectedEvents(olderIds)
  }

  async function syncPending({ recoverRejected = false } = {}) {
    if (!store) {
      updateSyncStatus({ state: 'error', lastErrorAt: Date.now(), lastError: 'Pilotlagringen är inte startad.' })
      return { ok: false, error: 'Pilotlagringen är inte startad.' }
    }
    const pending = await store.listPendingEvents()
    if (pending.length === 0) {
      if (recoverRejected) await recoverRejectedEvents()
      return reportCompletedSync()
    }
    updateSyncStatus({ state: 'syncing', pendingCount: pending.length, lastAttemptAt: Date.now(), lastError: '' })

    const prepared = pending.map(item => prepareEvent(item.event))
    const oversized = prepared.filter(event => eventBytes(event) > MAX_SERVER_EVENT_BYTES)
    if (oversized.length > 0) await store.rejectEvents(oversized.map(event => event.id))
    const batches = buildBatches(prepared.filter(event => eventBytes(event) <= MAX_SERVER_EVENT_BYTES))
    let sent = oversized.length
    for (const batch of batches) {
      let result
      try {
        result = await postEvents(batch)
      } catch (error) {
        const message = String(error?.message || 'Kunde inte kontakta servern.')
        updateSyncStatus({ state: 'pending', pendingCount: pending.length - sent, lastErrorAt: Date.now(), lastError: message })
        return { ok: false, error: message }
      }

      if (!result?.ok) {
        // Isolate individually rejected entries while preserving them in the vault.
        if (UNSENDABLE_STATUSES.has(result?.status)) {
          const outcome = await sendApart(batch)
          if (!outcome.ok) {
            updateSyncStatus({ state: 'pending', pendingCount: pending.length - sent, lastErrorAt: Date.now(), lastError: outcome.error })
            return { ok: false, error: outcome.error }
          }
          sent += batch.length
          updateSyncStatus({ pendingCount: Math.max(0, pending.length - sent) })
          continue
        }
        const error = String(result?.error || 'Kunde inte synka arbetet.')
        updateSyncStatus({ state: 'pending', pendingCount: pending.length - sent, lastErrorAt: Date.now(), lastError: error })
        return result || { ok: false, error }
      }

      const submitted = new Set(batch.map(event => event.id))
      const ack = (Array.isArray(result.ack) ? result.ack : []).filter(id => submitted.has(id))
      if (ack.length !== batch.length) {
        const error = 'Servern bekräftade inte hela händelsebatchen.'
        updateSyncStatus({ state: 'pending', pendingCount: pending.length - sent, lastErrorAt: Date.now(), lastError: error })
        return { ok: false, error }
      }
      await store.acknowledgeEvents(ack)
      sent += batch.length
      updateSyncStatus({ pendingCount: Math.max(0, pending.length - sent) })
    }

    if (recoverRejected) await recoverRejectedEvents()
    return reportCompletedSync()
  }

  return {
    async bootstrap(expectedStudentId) {
      const expected = normalizePilotStudentId(expectedStudentId)
      if (!expected) return { ok: false, error: 'Ogiltig elevlänk.' }
      const resumed = await resumeSession()
      if (!resumed?.ok) return resumed
      if (normalizePilotStudentId(resumed.student?.studentId) !== expected) {
        return { ok: false, error: 'Den aktiva elevsessionen stämmer inte med länken.' }
      }
      if (studentId !== expected || !store) {
        if (store) await store.close()
        studentId = expected
        store = await createStore({ studentId })
        recoveryAttempted = false
      }
      const shouldRecover = !recoveryAttempted
      recoveryAttempted = true
      const synced = await syncPending({ recoverRejected: shouldRecover })
      if (!synced.ok && !String(synced.error || '').includes('anslutningen')) return synced
      const loaded = await fetchProfile()
      if (!loaded?.ok || normalizePilotStudentId(loaded.profile?.studentId) !== expected) {
        return loaded?.ok ? { ok: false, error: 'Profilen stämmer inte med elevsessionen.' } : loaded
      }
      await store.saveSnapshot(loaded.profile)
      return { ok: true, profile: loaded.profile, pendingSync: !synced.ok, rejectedCount: syncStatus.rejectedCount }
    },

    async persistEvent(profile, event) {
      if (!store || normalizePilotStudentId(profile?.studentId) !== studentId) {
        updateSyncStatus({ state: 'error', lastErrorAt: Date.now(), lastError: 'Pilotlagringen tillhör inte den aktiva eleven.' })
        return { ok: false, error: 'Pilotlagringen tillhör inte den aktiva eleven.' }
      }
      try {
        await store.saveSnapshotAndAppendEvent({ snapshot: profile, event })
      } catch (error) {
        updateSyncStatus({ state: 'error', lastErrorAt: Date.now(), lastError: String(error?.message || 'Svaret kunde inte sparas på enheten.') })
        throw error
      }
      updateSyncStatus({ state: 'pending', pendingCount: syncStatus.pendingCount + 1 })
      return syncPending()
    },

    getSyncStatus() {
      return { ...syncStatus }
    },

    subscribeSyncStatus(listener) {
      if (typeof listener !== 'function') return () => {}
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    async persistCheckpoint(profile) {
      const capturedAt = Date.now()
      return this.persistEvent(profile, compactCheckpointEvent({
        id: makeEventId(), type: 'profile_checkpoint', timestamp: capturedAt,
        payload: checkpointPayload(profile, capturedAt)
      }))
    },

    async persistCustomEvent(profile, type, payload, timestamp = Date.now()) {
      return this.persistEvent(profile, {
        id: makeEventId(), type, timestamp, payload
      })
    },

    async close() {
      if (store) store.close()
      store = null
      studentId = ''
      recoveryAttempted = false
      updateSyncStatus({ state: 'idle', pendingCount: 0, rejectedCount: 0, lastAttemptAt: 0, lastSuccessAt: 0, lastErrorAt: 0, lastError: '' })
    }
  }
}

let activeRuntime = null

export function getPilotStudentRuntime() {
  if (!activeRuntime) activeRuntime = createPilotStudentRuntime()
  return activeRuntime
}
