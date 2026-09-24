import {
  fetchStudentSessionProfile,
  postStudentSessionEvents,
  resumeStudentSession
} from './studentSessionClient'
import { createPilotStudentStore } from './pilotStudentStore'

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

function checkpointPayload(profile, capturedAt) {
  const payload = { capturedAt }
  for (const field of CHECKPOINT_FIELDS) {
    if (profile?.[field] !== undefined) payload[field] = structuredClone(profile[field])
  }
  return payload
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
  const listeners = new Set()
  let syncStatus = {
    state: 'idle',
    pendingCount: 0,
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

  async function syncPending() {
    if (!store) {
      updateSyncStatus({ state: 'error', lastErrorAt: Date.now(), lastError: 'Pilotlagringen är inte startad.' })
      return { ok: false, error: 'Pilotlagringen är inte startad.' }
    }
    const pending = await store.listPendingEvents()
    if (pending.length === 0) {
      updateSyncStatus({ state: 'synced', pendingCount: 0, lastSuccessAt: Date.now(), lastErrorAt: 0, lastError: '' })
      return { ok: true }
    }
    updateSyncStatus({ state: 'syncing', pendingCount: pending.length, lastAttemptAt: Date.now(), lastError: '' })
    for (let start = 0; start < pending.length; start += 100) {
      const batch = pending.slice(start, start + 100).map(item => item.event)
      let result
      try {
        result = await postEvents(batch)
      } catch (error) {
        const message = String(error?.message || 'Kunde inte kontakta servern.')
        updateSyncStatus({ state: 'pending', pendingCount: pending.length - start, lastErrorAt: Date.now(), lastError: message })
        return { ok: false, error: message }
      }
      if (!result?.ok) {
        // A rejected batch never becomes valid by waiting, and one bad event
        // blocks every later result. Isolate the offenders and drop them.
        if (result?.status === 400 && batch.length > 0) {
          const discarded = []
          for (const event of batch) {
            const single = await postEvents([event])
            if (single?.ok) await store.acknowledgeEvents([event.id])
            else if (single?.status === 400) discarded.push(event.id)
            else {
              const error = String(single?.error || 'Kunde inte synka arbetet.')
              if (discarded.length > 0) await store.acknowledgeEvents(discarded)
              updateSyncStatus({ state: 'pending', pendingCount: pending.length - start, lastErrorAt: Date.now(), lastError: error })
              return { ok: false, error }
            }
          }
          if (discarded.length > 0) await store.acknowledgeEvents(discarded)
          updateSyncStatus({ pendingCount: Math.max(0, pending.length - start - batch.length) })
          continue
        }
        const error = String(result?.error || 'Kunde inte synka arbetet.')
        updateSyncStatus({ state: 'pending', pendingCount: pending.length - start, lastErrorAt: Date.now(), lastError: error })
        return result || { ok: false, error }
      }
      const submitted = new Set(batch.map(event => event.id))
      const ack = (Array.isArray(result.ack) ? result.ack : []).filter(id => submitted.has(id))
      if (ack.length !== batch.length) {
        const error = 'Servern bekräftade inte hela händelsebatchen.'
        updateSyncStatus({ state: 'pending', pendingCount: pending.length - start, lastErrorAt: Date.now(), lastError: error })
        return { ok: false, error }
      }
      await store.acknowledgeEvents(ack)
      updateSyncStatus({ pendingCount: Math.max(0, pending.length - start - batch.length) })
    }
    updateSyncStatus({ state: 'synced', pendingCount: 0, lastSuccessAt: Date.now(), lastErrorAt: 0, lastError: '' })
    return { ok: true }
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
      }
      const synced = await syncPending()
      if (!synced.ok && !String(synced.error || '').includes('anslutningen')) return synced
      const loaded = await fetchProfile()
      if (!loaded?.ok || normalizePilotStudentId(loaded.profile?.studentId) !== expected) {
        return loaded?.ok ? { ok: false, error: 'Profilen stämmer inte med elevsessionen.' } : loaded
      }
      await store.saveSnapshot(loaded.profile)
      updateSyncStatus({
        state: synced.ok ? 'synced' : 'pending',
        lastSuccessAt: synced.ok ? Date.now() : syncStatus.lastSuccessAt,
        lastErrorAt: synced.ok ? 0 : syncStatus.lastErrorAt,
        lastError: synced.ok ? '' : syncStatus.lastError
      })
      return { ok: true, profile: loaded.profile, pendingSync: !synced.ok }
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
      updateSyncStatus({ state: 'pending', pendingCount: syncStatus.pendingCount + 1, lastError: '' })
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
      return this.persistEvent(profile, {
        id: makeEventId(), type: 'profile_checkpoint', timestamp: capturedAt,
        payload: checkpointPayload(profile, capturedAt)
      })
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
      updateSyncStatus({ state: 'idle', pendingCount: 0, lastAttemptAt: 0, lastSuccessAt: 0, lastErrorAt: 0, lastError: '' })
    }
  }
}

let activeRuntime = null

export function getPilotStudentRuntime() {
  if (!activeRuntime) activeRuntime = createPilotStudentRuntime()
  return activeRuntime
}
