import {
  fetchStudentSessionProfile,
  postStudentSessionEvents,
  resumeStudentSession
} from './studentSessionClient'
import { createPilotStudentStore } from './pilotStudentStore'

const CHECKPOINT_FIELDS = ['currentDifficulty', 'highestDifficulty', 'adaptive', 'operationAbilities', 'assignmentProgress', 'stats', 'telemetry', 'activity']

function normalizeStudentId(value) {
  const id = String(value || '').trim().toUpperCase()
  return /^[A-F0-9]{32}$/.test(id) ? id : ''
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

  async function syncPending() {
    if (!store) return { ok: false, error: 'Pilotlagringen är inte startad.' }
    const pending = await store.listPendingEvents()
    for (let start = 0; start < pending.length; start += 100) {
      const batch = pending.slice(start, start + 100).map(item => item.event)
      const result = await postEvents(batch)
      if (!result?.ok) return result || { ok: false, error: 'Kunde inte synka arbetet.' }
      const submitted = new Set(batch.map(event => event.id))
      const ack = (Array.isArray(result.ack) ? result.ack : []).filter(id => submitted.has(id))
      if (ack.length !== batch.length) return { ok: false, error: 'Servern bekräftade inte hela händelsebatchen.' }
      await store.acknowledgeEvents(ack)
    }
    return { ok: true }
  }

  return {
    async bootstrap(expectedStudentId) {
      const expected = normalizeStudentId(expectedStudentId)
      if (!expected) return { ok: false, error: 'Ogiltig elevlänk.' }
      const resumed = await resumeSession()
      if (!resumed?.ok) return resumed
      if (normalizeStudentId(resumed.student?.studentId) !== expected) {
        return { ok: false, error: 'Den aktiva elevsessionen stämmer inte med länken.' }
      }
      studentId = expected
      store = await createStore({ studentId })
      const synced = await syncPending()
      if (!synced.ok && !String(synced.error || '').includes('anslutningen')) return synced
      const loaded = await fetchProfile()
      if (!loaded?.ok || normalizeStudentId(loaded.profile?.studentId) !== expected) {
        return loaded?.ok ? { ok: false, error: 'Profilen stämmer inte med elevsessionen.' } : loaded
      }
      await store.saveSnapshot(loaded.profile)
      return { ok: true, profile: loaded.profile, pendingSync: !synced.ok }
    },

    async persistEvent(profile, event) {
      if (!store || normalizeStudentId(profile?.studentId) !== studentId) {
        return { ok: false, error: 'Pilotlagringen tillhör inte den aktiva eleven.' }
      }
      await store.saveSnapshotAndAppendEvent({ snapshot: profile, event })
      return syncPending()
    },

    async persistCheckpoint(profile) {
      const capturedAt = Date.now()
      return this.persistEvent(profile, {
        id: makeEventId(), type: 'profile_checkpoint', timestamp: capturedAt,
        payload: checkpointPayload(profile, capturedAt)
      })
    },

    async close() {
      if (store) store.close()
      store = null
      studentId = ''
    }
  }
}

let activeRuntime = null

export function getPilotStudentRuntime() {
  if (!activeRuntime) activeRuntime = createPilotStudentRuntime()
  return activeRuntime
}
