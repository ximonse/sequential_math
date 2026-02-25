export function createCloudSyncApi(deps) {
  const {
    CLOUD_ENABLED,
    CLOUD_FRESHNESS_FUTURE_TOLERANCE_MS,
    CLOUD_PROFILE_SYNC_THROTTLE_MS,
    getActiveStudentSessionSecret,
    getAllProfiles,
    getProfileClassIds,
    getStudentIdCandidates,
    getTeacherApiToken,
    loadProfile,
    normalizeLoadedProfile,
    normalizeStudentId,
    saveProfileLocalOnly,
    chooseFreshestProfile
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
    mergedCount: 0
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

      const idCandidates = getStudentIdCandidates(studentId)
      for (const candidateId of idCandidates) {
        const response = await fetch(`/api/student/${encodeURIComponent(candidateId)}`, requestOptions)
        if (response.status === 401 && options.failOnUnauthorized) {
          const error = new Error('Unauthorized')
          error.code = 'UNAUTHORIZED'
          throw error
        }
        if (!response.ok) continue

        const data = await response.json()
        const profile = data?.profile || null
        if (!profile) continue
        const normalized = normalizeLoadedProfile(profile, candidateId)
        if (!normalized) continue
        return normalized
      }
      return null
    } catch (error) {
      if (error?.code === 'UNAUTHORIZED') throw error
      return null
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
      if (!response.ok) return null

      const data = await response.json()
      const mergedProfile = data?.profile
      if (mergedProfile && typeof mergedProfile === 'object') {
        return normalizeLoadedProfile(mergedProfile, normalizedId)
      }
      return null
    } catch {
      return null
    }
  }

  function normalizeCloudListProfile(raw) {
    if (!raw || typeof raw !== 'object') return null

    const studentId = normalizeStudentId(raw.studentId)
    if (!studentId) return null

    return normalizeLoadedProfile({
      ...raw,
      studentId,
      recentProblems: Array.isArray(raw.recentProblems) ? raw.recentProblems : [],
      auth: {
        lastLoginAt: raw.auth?.lastLoginAt || null,
        loginCount: Number.isFinite(Number(raw.auth?.loginCount))
          ? Number(raw.auth?.loginCount)
          : 0,
        passwordUpdatedAt: raw.auth?.passwordUpdatedAt || null
      }
    }, studentId)
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
          mergedCount: local.length
        })
        return local
      }
      const data = await response.json()
      const cloud = Array.isArray(data?.profiles) ? data.profiles : []

      const merged = new Map()
      for (const p of local) merged.set(p.studentId, p)

      for (const raw of cloud) {
        const p = normalizeCloudListProfile(raw)
        if (!p) continue
        const prev = merged.get(p.studentId)
        if (!prev) {
          merged.set(p.studentId, p)
        } else {
          merged.set(
            p.studentId,
            chooseFreshestProfile(prev, p, {
              getProfileClassIds,
              futureToleranceMs: CLOUD_FRESHNESS_FUTURE_TOLERANCE_MS
            })
          )
        }
      }

      const mergedProfiles = Array.from(merged.values())
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
        mergedCount: local.length
      })
      return local
    }
  }

  function requestCloudSync(profile, options = {}) {
    if (!CLOUD_ENABLED || !profile) return
    const normalizedId = normalizeStudentId(profile.studentId)
    if (!normalizedId) return

    const state = getCloudProfileSyncState(normalizedId)
    if (!state) return

    const syncNow = async (sourceProfile = null) => {
      const latest = sourceProfile || loadProfile(normalizedId)
      if (!latest) return
      state.lastAttemptAt = Date.now()
      const merged = await syncProfileToCloud(latest)
      if (merged) {
        saveProfileLocalOnly(merged)
      } else {
        setTimeout(async () => {
          const retryProfile = loadProfile(normalizedId)
          if (retryProfile) {
            const retryMerged = await syncProfileToCloud(retryProfile)
            if (retryMerged) saveProfileLocalOnly(retryMerged)
          }
        }, 10_000)
      }
    }

    if (options.forceSync === true) {
      clearCloudProfileSyncTimer(state)
      void syncNow(profile)
      return
    }

    const now = Date.now()
    const elapsed = now - Number(state.lastAttemptAt || 0)
    if (state.lastAttemptAt <= 0 || elapsed >= CLOUD_PROFILE_SYNC_THROTTLE_MS) {
      clearCloudProfileSyncTimer(state)
      void syncNow(profile)
      return
    }

    if (!state.timer) {
      const waitMs = Math.max(0, CLOUD_PROFILE_SYNC_THROTTLE_MS - elapsed)
      state.timer = setTimeout(() => {
        state.timer = null
        void syncNow()
      }, waitMs)
    }
  }

  return {
    getCloudProfilesSyncStatus,
    getAllProfilesWithSync,
    loadProfileFromCloud,
    requestCloudSync,
    syncProfileToCloud
  }
}
