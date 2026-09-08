import {
  addPendingSync,
  cancelAllRetries,
  cancelRetries,
  getPendingSyncIds,
  loadPendingSnapshot,
  removePendingSync,
  scheduleRetry
} from './storageCloudSyncQueue'
import { getUnsynced, markSynced, pruneWal } from './syncWal'
import { normalizeTeacherListProfile } from './teacherListProfile'

export function normalizeCloudSyncTimestamp(value) {
  const ts = Number(value)
  if (!Number.isFinite(ts) || ts <= 0) return 0
  return ts
}

export function stableSerializeForCloudSync(value) {
  if (value === null) return 'null'
  const valueType = typeof value
  if (valueType === 'number' || valueType === 'boolean' || valueType === 'string') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerializeForCloudSync(item)).join(',')}]`
  }
  if (valueType === 'object') {
    const keys = Object.keys(value).sort()
    const parts = keys.map(key => `${JSON.stringify(key)}:${stableSerializeForCloudSync(value[key])}`)
    return `{${parts.join(',')}}`
  }
  return JSON.stringify(String(value))
}

export function buildCloudSyncProblemEntryKey(entry) {
  const id = String(entry?.problemId || '').trim()
  if (id) return `id:${id}`

  const type = String(entry?.problemType || '').trim()
  const ts = normalizeCloudSyncTimestamp(entry?.timestamp)
  const studentAnswer = String(entry?.studentAnswer ?? '')
  const correctAnswer = String(entry?.correctAnswer ?? '')
  const values = stableSerializeForCloudSync(entry?.values || {})
  return `raw:${type}|${ts}|${studentAnswer}|${correctAnswer}|${values}`
}

export function mergeCloudSyncProblemEntries(existingEntries, incomingEntries, limit) {
  const mergedByKey = new Map()

  const upsert = (entry, sourceRank) => {
    if (!entry || typeof entry !== 'object') return
    const key = buildCloudSyncProblemEntryKey(entry)
    const ts = normalizeCloudSyncTimestamp(entry?.timestamp)
    const previous = mergedByKey.get(key)
    if (!previous) {
      mergedByKey.set(key, { entry, ts, sourceRank })
      return
    }
    if (ts > previous.ts || (ts === previous.ts && sourceRank >= previous.sourceRank)) {
      mergedByKey.set(key, { entry, ts, sourceRank })
    }
  }

  for (const entry of (Array.isArray(existingEntries) ? existingEntries : [])) {
    upsert(entry, 0)
  }
  for (const entry of (Array.isArray(incomingEntries) ? incomingEntries : [])) {
    upsert(entry, 1)
  }

  const merged = Array.from(mergedByKey.values())
    .map(item => item.entry)
    .sort((a, b) => normalizeCloudSyncTimestamp(a?.timestamp) - normalizeCloudSyncTimestamp(b?.timestamp))

  if (Number.isFinite(Number(limit)) && limit > 0 && merged.length > limit) {
    return merged.slice(-limit)
  }
  return merged
}

export function createCloudSyncApi(deps) {
  const {
    CLOUD_ENABLED,
    CLOUD_PROFILE_SYNC_THROTTLE_MS,
    getActiveStudentSessionSecret,
    getAllProfiles,
    getTeacherApiToken,
    loadProfile,
    normalizeLoadedProfile,
    normalizeStudentId,
    saveProfileLocalOnly
  } = deps

  const CLOUD_PROFILE_SYNC_STATE = new Map()
  const CLOUD_PROFILE_SYNC_STATUS = {
    lastAttemptAt: 0,
    lastSuccessAt: 0,
    lastErrorAt: 0,
    lastError: '',
    lastSource: CLOUD_ENABLED ? 'never' : 'cloud_disabled',
    localCount: 0,
    cloudCount: 0,
    mergedCount: 0,
    authStale: false
  }

  function setCloudProfilesSyncStatus(patch) {
    Object.assign(CLOUD_PROFILE_SYNC_STATUS, patch || {})
  }

  function getCloudProfilesSyncStatus() {
    return {
      ...CLOUD_PROFILE_SYNC_STATUS
    }
  }

  function isTeacherSessionToken(value) {
    return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || '').trim())
  }

  function applyTeacherAuthHeader(headers, teacherCredential) {
    const credential = String(teacherCredential || '').trim()
    if (!credential) return
    if (isTeacherSessionToken(credential)) {
      headers['x-teacher-token'] = credential
      return
    }
    headers['x-teacher-password'] = credential
  }

  function getCloudProfileSyncState(studentId) {
    const normalizedId = normalizeStudentId(studentId)
    if (!normalizedId) return null
    const existing = CLOUD_PROFILE_SYNC_STATE.get(normalizedId)
    if (existing) return existing
    const created = {
      lastAttemptAt: 0,
      timer: null
    }
    CLOUD_PROFILE_SYNC_STATE.set(normalizedId, created)
    return created
  }

  function clearCloudProfileSyncTimer(state) {
    if (!state || !state.timer) return
    clearTimeout(state.timer)
    state.timer = null
  }


  async function loadProfileFromCloud(studentId, options = {}) {
    if (!CLOUD_ENABLED) return null

    try {
      const headers = {}
      const studentPassword = String(options.studentPassword || '')
      const teacherPassword = String(options.teacherPassword || '')
      if (studentPassword) headers['x-student-password'] = studentPassword
      if (teacherPassword) applyTeacherAuthHeader(headers, teacherPassword)

      const requestOptions = {
        cache: 'no-store'
      }
      if (Object.keys(headers).length > 0) {
        requestOptions.headers = headers
      }

      const normalizedId = normalizeStudentId(studentId)
      const response = await fetch(`/api/student/${encodeURIComponent(normalizedId)}`, requestOptions)
      if (response.status === 401 && options.failOnUnauthorized) {
        const error = new Error('Unauthorized')
        error.code = 'UNAUTHORIZED'
        throw error
      }
      if (!response.ok) return null

      const data = await response.json()
      const profile = data?.profile || null
      return normalizeLoadedProfile(profile, normalizedId)
    } catch (error) {
      if (error?.code === 'UNAUTHORIZED') throw error
      return null
    }
  }

  async function deleteProfileFromCloud(studentId) {
    const normalizedId = normalizeStudentId(studentId)
    if (!normalizedId) return { ok: false, error: 'Kunde inte lasa elev-ID.' }
    if (!CLOUD_ENABLED) return { ok: true }

    const teacherToken = getTeacherApiToken()
    if (!teacherToken) {
      return { ok: false, error: 'Logga in som larare igen innan eleven raderas.' }
    }

    try {
      const headers = {}
      applyTeacherAuthHeader(headers, teacherToken)
      const response = await fetch(`/api/student/${encodeURIComponent(normalizedId)}`, {
        method: 'DELETE',
        headers,
        cache: 'no-store'
      })
      if (!response.ok) {
        return { ok: false, error: 'Kunde inte radera eleven fran servern.' }
      }
      removePendingSync(normalizedId)
      cancelRetries(normalizedId)
      const state = getCloudProfileSyncState(normalizedId)
      state.deleted = true
      clearCloudProfileSyncTimer(state)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Kunde inte kontakta servern for radering.' }
    }
  }

  async function syncProfileToCloud(profile) {
    if (!CLOUD_ENABLED) return null

    try {
      const normalizedId = normalizeStudentId(profile.studentId)
      const headers = {
        'Content-Type': 'application/json'
      }
      const studentSecret = getActiveStudentSessionSecret()
      const teacherToken = getTeacherApiToken()
      if (studentSecret) headers['x-student-password'] = studentSecret
      if (teacherToken) applyTeacherAuthHeader(headers, teacherToken)

      if (!studentSecret && !teacherToken) {
        console.warn('[cloud-sync] No auth credentials available — skipping sync for', normalizedId)
        return null
      }

      const response = await fetch(`/api/student/${encodeURIComponent(normalizedId)}`, {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: JSON.stringify({
          profile: {
            ...profile,
            studentId: normalizedId
          }
        })
      })
      if (response.status === 401) {
        console.warn('[cloud-sync] 401 Unauthorized for', normalizedId, '— session secret may be stale')
        setCloudProfilesSyncStatus({
          lastErrorAt: Date.now(),
          lastError: 'Obehörig (401) — lösenordet kan ha ändrats. Logga in igen.',
          lastSource: 'cloud_auth_stale',
          authStale: true
        })
        return null
      }
      if (!response.ok) return null

      const data = await response.json()
      const mergedProfile = data?.profile
      if (mergedProfile && typeof mergedProfile === 'object') {
        setCloudProfilesSyncStatus({ authStale: false })
        return normalizeLoadedProfile(mergedProfile, normalizedId)
      }
      return null
    } catch {
      return null
    }
  }


  async function getAllProfilesWithSync() {
    const local = getAllProfiles()
    setCloudProfilesSyncStatus({
      lastAttemptAt: Date.now(),
      localCount: local.length,
      cloudCount: 0,
      mergedCount: local.length
    })
    if (!CLOUD_ENABLED) {
      setCloudProfilesSyncStatus({
        lastSource: 'cloud_disabled'
      })
      return local
    }

    try {
      const teacherApiToken = getTeacherApiToken()
      const requestOptions = {
        cache: 'no-store'
      }
      if (teacherApiToken) {
        const headers = {}
        applyTeacherAuthHeader(headers, teacherApiToken)
        if (Object.keys(headers).length > 0) {
          requestOptions.headers = headers
        }
      }
      const response = await fetch('/api/students', requestOptions)
      if (!response.ok) {
        const message = response.status === 401
          ? 'Obehörig mot servern (401).'
          : `Serverfel vid elevhämtning (${response.status}).`
        setCloudProfilesSyncStatus({
          lastErrorAt: Date.now(),
          lastError: message,
          lastSource: response.status === 401 ? 'cloud_unauthorized' : 'cloud_http_error',
          cloudCount: 0,
          mergedCount: 0
        })
        return []
      }
      const data = await response.json()
      const cloud = Array.isArray(data?.profiles) ? data.profiles : []

      const mergedProfiles = cloud.map(raw => normalizeTeacherListProfile(raw, normalizeStudentId)).filter(Boolean)
      if (mergedProfiles.length !== cloud.length) throw new Error('Invalid teacher list contract')
      if (teacherApiToken !== getTeacherApiToken()) return []
      setCloudProfilesSyncStatus({
        lastSuccessAt: Date.now(),
        lastErrorAt: 0,
        lastError: '',
        lastSource: 'cloud_merged',
        cloudCount: cloud.length,
        mergedCount: mergedProfiles.length
      })
      return mergedProfiles
    } catch {
      setCloudProfilesSyncStatus({
        lastErrorAt: Date.now(),
        lastError: 'Nätverksfel vid elevhämtning från server.',
        lastSource: 'cloud_fetch_error',
        cloudCount: 0,
        mergedCount: 0
      })
      return []
    }
  }

  async function syncWalEntries(studentId) {
    const normalizedId = normalizeStudentId(studentId)
    if (!normalizedId) return
    const entries = getUnsynced(normalizedId).slice(0, 100)
    if (entries.length === 0) return

    try {
      const headers = { 'Content-Type': 'application/json' }
      const studentSecret = getActiveStudentSessionSecret()
      const teacherToken = getTeacherApiToken()
      if (studentSecret) headers['x-student-password'] = studentSecret
      if (teacherToken) applyTeacherAuthHeader(headers, teacherToken)
      if (!studentSecret && !teacherToken) return

      const response = await fetch(`/api/student/${encodeURIComponent(normalizedId)}/events`, {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: JSON.stringify({ entries })
      })

      if (!response.ok) return

      const data = await response.json()
      if (Array.isArray(data?.ack) && data.ack.length > 0) {
        const submitted = new Set(entries.map(entry => entry.id))
        const ack = data.ack.filter(id => submitted.has(id))
        if (!ack.length) return
        markSynced(normalizedId, ack)
        pruneWal(normalizedId)
        if (getUnsynced(normalizedId).length > 0) await syncWalEntries(normalizedId)
      }
    } catch {
      // WAL sync failure is non-critical — full profile sync is the primary path
    }
  }

  function syncQueuedStudent(studentId) {
    const state = getCloudProfileSyncState(studentId)
    if (!state || state.deleted) return Promise.resolve(true)
    if (state.inFlight) return state.inFlight
    clearCloudProfileSyncTimer(state)
    state.lastAttemptAt = Date.now()
    state.inFlight = (async () => {
      await syncWalEntries(studentId)
      if (state.deleted) return true
      const latest = loadProfile(studentId) || loadPendingSnapshot(studentId)
      if (!latest) { removePendingSync(studentId); return true }
      const sent = JSON.parse(JSON.stringify(latest))
      const fingerprint = stableSerializeForCloudSync(sent)
      const merged = await syncProfileToCloud(sent)
      if (state.deleted) return true
      const current = loadProfile(studentId) || loadPendingSnapshot(studentId)
      if (!current) { removePendingSync(studentId); return true }
      if (!merged) return false
      if (stableSerializeForCloudSync(current) !== fingerprint) {
        addPendingSync(studentId, current)
        return false
      }
      saveProfileLocalOnly(merged)
      if (getUnsynced(studentId).length > 0) return false
      removePendingSync(studentId)
      cancelRetries(studentId)
      return true
    })().finally(() => { state.inFlight = null })
    return state.inFlight
  }

  function requestCloudSync(profile, options = {}) {
    if (!CLOUD_ENABLED || !profile) return
    const studentId = normalizeStudentId(profile.studentId)
    const state = getCloudProfileSyncState(studentId)
    if (!state || state.deleted) return
    addPendingSync(studentId, profile)
    const run = async () => {
      try {
        if (!await syncQueuedStudent(studentId)) scheduleRetry(studentId, syncQueuedStudent)
      } catch { scheduleRetry(studentId, syncQueuedStudent) }
    }
    if (state.inFlight) return
    const elapsed = Date.now() - state.lastAttemptAt
    if (options.forceSync || state.lastAttemptAt === 0 || elapsed >= CLOUD_PROFILE_SYNC_THROTTLE_MS) {
      clearCloudProfileSyncTimer(state)
      return run()
    }
    if (!state.timer) {
      state.timer = setTimeout(() => { state.timer = null; void run() }, CLOUD_PROFILE_SYNC_THROTTLE_MS - elapsed)
    }
  }

  async function flushPendingSyncs() {
    if (!CLOUD_ENABLED) return { flushed: 0, failed: 0 }
    let flushed = 0, failed = 0
    for (const studentId of getPendingSyncIds()) {
      try {
        if (await syncQueuedStudent(studentId)) flushed++
        else { failed++; scheduleRetry(studentId, syncQueuedStudent) }
      } catch { failed++; scheduleRetry(studentId, syncQueuedStudent) }
    }
    return { flushed, failed }
  }

  function attemptBeforeUnloadSync() {
    if (!CLOUD_ENABLED) return
    const pendingIds = getPendingSyncIds()
    for (const studentId of pendingIds) {
      const profile = loadProfile(studentId)
      if (!profile) continue
      const normalizedId = normalizeStudentId(studentId)
      const headers = { 'Content-Type': 'application/json' }
      const studentSecret = getActiveStudentSessionSecret()
      const teacherToken = getTeacherApiToken()
      if (studentSecret) headers['x-student-password'] = studentSecret
      if (teacherToken) applyTeacherAuthHeader(headers, teacherToken)
      if (!studentSecret && !teacherToken) continue
      try {
        fetch(`/api/student/${encodeURIComponent(normalizedId)}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ profile: { ...profile, studentId: normalizedId } }),
          keepalive: true
        }).catch(() => {})
      } catch { /* best effort */ }
    }
  }

  function getSyncHealth() {
    const pendingIds = getPendingSyncIds()
    return {
      hasPending: pendingIds.length > 0,
      pendingCount: pendingIds.length,
      pendingIds
    }
  }


  let listenersRegistered = false

  function initCloudSyncListeners() {
    if (listenersRegistered || !CLOUD_ENABLED) return
    listenersRegistered = true

    window.addEventListener('online', () => {
      void flushPendingSyncs()
    })

    window.addEventListener('beforeunload', () => {
      attemptBeforeUnloadSync()
    })

    // visibilitychange is more reliable than beforeunload on iOS Safari
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        attemptBeforeUnloadSync()
      }
    })

    // Flush any leftovers from previous sessions
    void flushPendingSyncs()
  }

  function destroyCloudSyncListeners() {
    cancelAllRetries()
  }

  return {
    deleteProfileFromCloud,
    getCloudProfilesSyncStatus,
    getAllProfilesWithSync,
    loadProfileFromCloud,
    requestCloudSync,
    syncProfileToCloud,
    flushPendingSyncs,
    attemptBeforeUnloadSync,
    getSyncHealth,
    initCloudSyncListeners,
    destroyCloudSyncListeners
  }
}
