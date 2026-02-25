export function createStorageStudentApi(deps) {
  const {
    CLOUD_ENABLED,
    createStudentProfile,
    ensureProfileAuth,
    getActiveStudentSessionSecret,
    getTeacherApiToken,
    isStudentSessionActive,
    loadProfile,
    loadProfileFromCloud,
    normalizeStudentId,
    saveProfile,
    saveProfileLocalOnly,
    setActiveStudentSession,
    setProfilePassword,
    syncProfileToCloud,
    verifyPasswordForProfile
  } = deps

  async function createAndSaveProfile(studentId, name, grade = 4, options = {}) {
    const normalizedId = normalizeStudentId(studentId)
    if (!normalizedId) {
      throw new Error('Invalid student id')
    }

    const displayName = String(name || normalizedId).trim() || normalizedId
    const profile = createStudentProfile(normalizedId, displayName, grade)

    profile.auth = {
      passwordUpdatedAt: Date.now(),
      lastLoginAt: null,
      loginCount: 0
    }
    await setProfilePassword(profile, String(options.initialPassword || displayName))

    profile.classId = options.classId || null
    profile.className = options.className || null
    profile.classIds = options.classId ? [String(options.classId)] : []
    ensureProfileAuth(profile)

    saveProfile(profile, { forceSync: true })
    return profile
  }

  async function getOrCreateProfile(studentId, name = null, grade = 4) {
    const normalizedId = normalizeStudentId(studentId)
    let profile = loadProfile(normalizedId)

    if (!profile) {
      const displayName = name || `Elev ${normalizedId}`
      profile = await createAndSaveProfile(normalizedId, displayName, grade)
    }

    ensureProfileAuth(profile)
    return profile
  }

  async function getOrCreateProfileWithSync(studentId, name = null, grade = 4, options = {}) {
    const normalizedId = normalizeStudentId(studentId)
    const createIfMissing = options.createIfMissing !== false
    const local = loadProfile(normalizedId)
    if (local) {
      if (CLOUD_ENABLED) {
        const merged = await syncProfileToCloud(local)
        if (merged) {
          saveProfileLocalOnly(merged)
          return merged
        }
      }
      return local
    }

    if (CLOUD_ENABLED) {
      const cloud = await loadProfileFromCloud(normalizedId, {
        studentPassword: getActiveStudentSessionSecret(),
        teacherPassword: getTeacherApiToken()
      })
      if (cloud) {
        saveProfileLocalOnly(cloud)
        return cloud
      }
    }

    if (!createIfMissing) return null

    const displayName = name || `Elev ${normalizedId}`
    return createAndSaveProfile(normalizedId, displayName, grade)
  }

  async function authenticateStudent(studentIdInput, passwordInput) {
    const studentId = normalizeStudentId(studentIdInput)
    const password = String(passwordInput || '')

    if (!studentId) {
      return { ok: false, error: 'Ange inloggningsnamn.' }
    }

    if (password.trim() === '') {
      return { ok: false, error: 'Ange lösenord.' }
    }

    let profile = loadProfile(studentId)
    if (!profile && CLOUD_ENABLED) {
      try {
        profile = await loadProfileFromCloud(studentId, {
          studentPassword: password,
          failOnUnauthorized: true
        })
        if (profile) {
          saveProfileLocalOnly(profile)
        }
      } catch (error) {
        if (error?.code === 'UNAUTHORIZED') {
          return { ok: false, error: 'Fel lösenord.' }
        }
        throw error
      }
    }

    if (!profile) {
      return {
        ok: false,
        error: 'Eleven finns inte i systemet ännu. Be läraren lägga till dig i klasslistan.'
      }
    }

    if (CLOUD_ENABLED) {
      try {
        const merged = await syncProfileToCloud(profile)
        if (merged) {
          profile = merged
          saveProfileLocalOnly(profile)
        }
      } catch {
        // Behåll lokal inloggning om cloud tillfälligt inte svarar.
      }
    }

    ensureProfileAuth(profile)

    let validPassword = await verifyPasswordForProfile(profile, password)

    if (!validPassword && CLOUD_ENABLED) {
      try {
        const cloudProfile = await loadProfileFromCloud(studentId, {
          studentPassword: password,
          failOnUnauthorized: true
        })
        if (cloudProfile) {
          profile = cloudProfile
          saveProfileLocalOnly(profile)
          validPassword = true
        }
      } catch (error) {
        if (error?.code === 'UNAUTHORIZED') {
          return { ok: false, error: 'Fel lösenord.' }
        }
        throw error
      }
    }

    if (!validPassword) {
      return { ok: false, error: 'Fel lösenord.' }
    }

    profile.auth.lastLoginAt = Date.now()
    profile.auth.loginCount = (profile.auth.loginCount || 0) + 1
    setActiveStudentSession(profile.studentId, password)
    saveProfile(profile)

    return { ok: true, profile }
  }

  async function changeStudentPassword(studentId, currentPassword, newPassword) {
    const profile = loadProfile(studentId)
    if (!profile) return { ok: false, error: 'Elev saknas.' }

    ensureProfileAuth(profile)

    const validCurrentPassword = await verifyPasswordForProfile(profile, String(currentPassword || ''))
    if (!validCurrentPassword) {
      return { ok: false, error: 'Nuvarande lösenord stämmer inte.' }
    }

    if (String(newPassword || '').trim().length < 3) {
      return { ok: false, error: 'Nytt lösenord måste vara minst 3 tecken.' }
    }

    await setProfilePassword(profile, String(newPassword))
    saveProfile(profile, { forceSync: true })
    if (isStudentSessionActive(studentId)) {
      setActiveStudentSession(studentId, String(newPassword))
    }
    return { ok: true }
  }

  async function resetStudentPasswordToLoginName(studentId) {
    const normalizedId = normalizeStudentId(studentId)
    if (!normalizedId) return { ok: false, error: 'Elev saknas.' }

    let profile = loadProfile(normalizedId)
    if (!profile && CLOUD_ENABLED) {
      try {
        profile = await loadProfileFromCloud(normalizedId, {
          teacherPassword: getTeacherApiToken(),
          failOnUnauthorized: true
        })
        if (profile) {
          saveProfileLocalOnly(profile)
        }
      } catch (error) {
        if (error?.code === 'UNAUTHORIZED') {
          return { ok: false, error: 'Lärarbehörighet saknas. Logga ut/in som lärare och försök igen.' }
        }
        return { ok: false, error: 'Kunde inte hämta elev från servern.' }
      }
    }
    if (!profile) return { ok: false, error: 'Elev saknas lokalt och kunde inte hämtas från servern.' }

    ensureProfileAuth(profile)
    await setProfilePassword(profile, profile.studentId)
    saveProfile(profile, { forceSync: true })
    if (isStudentSessionActive(normalizedId)) {
      setActiveStudentSession(profile.studentId, profile.studentId)
    }
    return { ok: true, password: profile.studentId }
  }

  return {
    authenticateStudent,
    changeStudentPassword,
    createAndSaveProfile,
    getOrCreateProfile,
    getOrCreateProfileWithSync,
    resetStudentPasswordToLoginName
  }
}
