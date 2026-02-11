/**
 * Storage - Hanterar lagring av elevprofiler, elevinloggning och klasslistor.
 *
 * Phase 1: localStorage
 * Phase 2+: Cloud sync via Vercel API + KV
 */

import { createStudentProfile } from './studentProfile'
import { getTeacherApiToken } from './teacherAuth'

const STORAGE_PREFIX = 'mathapp_student_'
const STUDENTS_LIST_KEY = 'mathapp_students_list'
const STUDENT_SESSION_KEY = 'mathapp_student_session'
const STUDENT_SESSION_SECRET_KEY = 'mathapp_student_session_secret'
const CLASSES_KEY = 'mathapp_classes_v1'
const CLOUD_ENABLED = import.meta.env.VITE_ENABLE_CLOUD_SYNC === '1'
const PASSWORD_SCHEME = 'sha256-v1'

export function normalizeStudentId(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const ascii = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return ascii.toUpperCase()
}

function ensureProfileAuth(profile) {
  if (!profile.auth || typeof profile.auth !== 'object') {
    profile.auth = {
      password: profile.name || profile.studentId,
      passwordUpdatedAt: profile.created_at || Date.now(),
      lastLoginAt: null,
      loginCount: 0
    }
  }

  if (!hasHashedPassword(profile.auth) && (!profile.auth.password || String(profile.auth.password).trim() === '')) {
    profile.auth.password = profile.name || profile.studentId
  }

  if (typeof profile.auth.loginCount !== 'number') {
    profile.auth.loginCount = 0
  }

  if (!('lastLoginAt' in profile.auth)) {
    profile.auth.lastLoginAt = null
  }

  if (hasHashedPassword(profile.auth) && profile.auth.passwordScheme !== PASSWORD_SCHEME) {
    profile.auth.passwordScheme = PASSWORD_SCHEME
  }

  return profile
}

function hasHashedPassword(auth) {
  return Boolean(
    auth
    && auth.passwordScheme === PASSWORD_SCHEME
    && typeof auth.passwordHash === 'string'
    && auth.passwordHash.trim() !== ''
    && typeof auth.passwordSalt === 'string'
    && auth.passwordSalt.trim() !== ''
  )
}

function createPasswordSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function hashPasswordWithSalt(password, salt) {
  const encoded = new TextEncoder().encode(`${salt}:${String(password || '')}`)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function setProfilePassword(profile, plainPassword, options = {}) {
  ensureProfileAuth(profile)
  const salt = createPasswordSalt()
  const hash = await hashPasswordWithSalt(plainPassword, salt)
  const keepUpdatedAt = options.keepUpdatedAt === true
  const previousUpdatedAt = profile.auth.passwordUpdatedAt

  profile.auth.passwordScheme = PASSWORD_SCHEME
  profile.auth.passwordSalt = salt
  profile.auth.passwordHash = hash
  profile.auth.passwordUpdatedAt = keepUpdatedAt && previousUpdatedAt ? previousUpdatedAt : Date.now()
  delete profile.auth.password
}

async function verifyPasswordForProfile(profile, plainPassword) {
  ensureProfileAuth(profile)

  if (hasHashedPassword(profile.auth)) {
    const actualHash = await hashPasswordWithSalt(plainPassword, profile.auth.passwordSalt)
    return actualHash === profile.auth.passwordHash
  }

  const legacyPassword = String(profile.auth.password || '')
  if (!legacyPassword) return false
  if (plainPassword !== legacyPassword) return false

  // Migrera äldre klartextprofiler vid första lyckade inloggning.
  await setProfilePassword(profile, plainPassword, { keepUpdatedAt: true })
  return true
}

export function loadProfile(studentId) {
  const normalizedId = normalizeStudentId(studentId)
  if (!normalizedId) return null

  const data = localStorage.getItem(STORAGE_PREFIX + normalizedId)
  if (!data) return null

  try {
    const parsed = JSON.parse(data)
    parsed.studentId = normalizeStudentId(parsed.studentId || normalizedId)
    ensureProfileAuth(parsed)
    return parsed
  } catch (e) {
    console.error('Failed to parse profile:', e)
    return null
  }
}

export function saveProfile(profile) {
  saveProfileLocalOnly(profile)
  void syncProfileToCloud(profile)
}

export async function createAndSaveProfile(studentId, name, grade = 4, options = {}) {
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

  saveProfile(profile)
  return profile
}

export async function getOrCreateProfile(studentId, name = null, grade = 4) {
  const normalizedId = normalizeStudentId(studentId)
  let profile = loadProfile(normalizedId)

  if (!profile) {
    const displayName = name || `Elev ${normalizedId}`
    profile = await createAndSaveProfile(normalizedId, displayName, grade)
  }

  ensureProfileAuth(profile)
  return profile
}

export async function getOrCreateProfileWithSync(studentId, name = null, grade = 4, options = {}) {
  const normalizedId = normalizeStudentId(studentId)
  const createIfMissing = options.createIfMissing !== false
  const local = loadProfile(normalizedId)
  if (local) {
    void syncProfileToCloud(local)
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

export async function authenticateStudent(studentIdInput, passwordInput) {
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

  ensureProfileAuth(profile)

  let validPassword = await verifyPasswordForProfile(profile, password)

  // Lokal profil kan vara stale (t.ex. lösenord ändrat på annan enhet).
  // Försök verifiera mot cloud och uppdatera lokal profil vid träff.
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
  saveProfile(profile)
  setActiveStudentSession(studentId, password)

  return { ok: true, profile }
}

export async function changeStudentPassword(studentId, currentPassword, newPassword) {
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
  saveProfile(profile)
  if (isStudentSessionActive(studentId)) {
    setActiveStudentSession(studentId, String(newPassword))
  }
  return { ok: true }
}

export async function resetStudentPasswordToLoginName(studentId) {
  const profile = loadProfile(studentId)
  if (!profile) return { ok: false, error: 'Elev saknas.' }

  ensureProfileAuth(profile)
  await setProfilePassword(profile, profile.studentId)
  saveProfile(profile)
  if (isStudentSessionActive(studentId)) {
    setActiveStudentSession(studentId, profile.studentId)
  }
  return { ok: true }
}

export function setActiveStudentSession(studentId, sessionSecret = '') {
  const normalizedId = normalizeStudentId(studentId)
  if (!normalizedId) return
  localStorage.setItem(STUDENT_SESSION_KEY, normalizedId)
  sessionStorage.setItem(STUDENT_SESSION_SECRET_KEY, String(sessionSecret || ''))
}

export function clearActiveStudentSession() {
  localStorage.removeItem(STUDENT_SESSION_KEY)
  sessionStorage.removeItem(STUDENT_SESSION_SECRET_KEY)
}

export function getActiveStudentSession() {
  return normalizeStudentId(localStorage.getItem(STUDENT_SESSION_KEY) || '')
}

export function getActiveStudentSessionSecret() {
  return String(sessionStorage.getItem(STUDENT_SESSION_SECRET_KEY) || '')
}

export function isStudentSessionActive(studentId) {
  return getActiveStudentSession() === normalizeStudentId(studentId)
}

function updateStudentsList(studentId, name) {
  const list = getStudentsList()

  const existing = list.find(s => s.studentId === studentId)
  if (existing) {
    existing.name = name
    existing.lastActive = Date.now()
  } else {
    list.push({
      studentId,
      name,
      lastActive: Date.now()
    })
  }

  localStorage.setItem(STUDENTS_LIST_KEY, JSON.stringify(list))
}

export function getStudentsList() {
  const data = localStorage.getItem(STUDENTS_LIST_KEY)
  if (!data) return []

  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

export function getAllProfiles() {
  const list = getStudentsList()
  return list.map(s => loadProfile(s.studentId)).filter(Boolean)
}

export async function getAllProfilesWithSync() {
  const local = getAllProfiles()
  if (!CLOUD_ENABLED) return local

  try {
    const teacherApiToken = getTeacherApiToken()
    const response = await fetch('/api/students', teacherApiToken
      ? { headers: { 'x-teacher-password': teacherApiToken } }
      : undefined)
    if (!response.ok) return local
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
        const prevTs = getLastProblemTimestamp(prev)
        const cloudTs = getLastProblemTimestamp(p)
        merged.set(p.studentId, cloudTs >= prevTs ? p : prev)
      }

      // List-API är sanerat. Vi cachear inte auth-data lokalt här.
    }

    return Array.from(merged.values())
  } catch {
    return local
  }
}

export function deleteProfile(studentId) {
  const normalizedId = normalizeStudentId(studentId)
  localStorage.removeItem(STORAGE_PREFIX + normalizedId)

  const list = getStudentsList().filter(s => s.studentId !== normalizedId)
  localStorage.setItem(STUDENTS_LIST_KEY, JSON.stringify(list))
}

export function studentExists(studentId) {
  return loadProfile(studentId) !== null
}

export function getClasses() {
  const data = localStorage.getItem(CLASSES_KEY)
  if (!data) return []

  try {
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveClasses(classes) {
  localStorage.setItem(CLASSES_KEY, JSON.stringify(classes))
}

function parseRosterLines(rawList) {
  return String(rawList || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

function createUniqueStudentId(baseId, existingIds) {
  if (!existingIds.has(baseId)) {
    existingIds.add(baseId)
    return baseId
  }

  let counter = 2
  while (counter < 10000) {
    const candidate = `${baseId}_${counter}`
    if (!existingIds.has(candidate)) {
      existingIds.add(candidate)
      return candidate
    }
    counter += 1
  }

  throw new Error('Could not generate unique student id')
}

export async function createClassFromRoster(classNameInput, rosterText, grade = 4) {
  const className = String(classNameInput || '').trim()
  if (!className) {
    return { ok: false, error: 'Ange klassnamn.' }
  }

  const names = parseRosterLines(rosterText)
  if (names.length === 0) {
    return { ok: false, error: 'Klistra in minst ett namn.' }
  }

  const classes = getClasses()
  const allProfiles = getAllProfiles()
  const existingIds = new Set(allProfiles.map(p => p.studentId))

  const classId = `class_${Date.now()}`
  const studentIds = []

  for (const name of names) {
    const base = normalizeStudentId(name)
    if (!base) continue

    let profile = loadProfile(base)
    if (profile) {
      profile.name = name
      ensureProfileAuth(profile)
      profile.classId = classId
      profile.className = className
      saveProfile(profile)
      studentIds.push(profile.studentId)
      continue
    }

    const uniqueId = createUniqueStudentId(base, existingIds)
    const created = await createAndSaveProfile(uniqueId, name, grade, {
      initialPassword: name,
      classId,
      className
    })
    studentIds.push(created.studentId)
  }

  const classRecord = {
    id: classId,
    name: className,
    studentIds,
    createdAt: Date.now()
  }

  classes.unshift(classRecord)
  saveClasses(classes)

  return {
    ok: true,
    classRecord
  }
}

export async function addStudentsToClass(classId, rosterText, grade = 4) {
  const classes = getClasses()
  const target = classes.find(item => item.id === classId)
  if (!target) {
    return { ok: false, error: 'Välj en klass att lägga till elever i.' }
  }

  const names = parseRosterLines(rosterText)
  if (names.length === 0) {
    return { ok: false, error: 'Klistra in minst ett namn.' }
  }

  const allProfiles = getAllProfiles()
  const existingIds = new Set(allProfiles.map(p => p.studentId))
  const studentIds = new Set(target.studentIds || [])
  let addedCount = 0

  for (const name of names) {
    const base = normalizeStudentId(name)
    if (!base) continue

    let profile = loadProfile(base)
    if (profile) {
      profile.name = name
      ensureProfileAuth(profile)
      profile.classId = target.id
      profile.className = target.name
      saveProfile(profile)
      if (!studentIds.has(profile.studentId)) {
        studentIds.add(profile.studentId)
        addedCount += 1
      }
      continue
    }

    const uniqueId = createUniqueStudentId(base, existingIds)
    const created = await createAndSaveProfile(uniqueId, name, grade, {
      initialPassword: name,
      classId: target.id,
      className: target.name
    })

    if (!studentIds.has(created.studentId)) {
      studentIds.add(created.studentId)
      addedCount += 1
    }
  }

  target.studentIds = Array.from(studentIds)
  saveClasses(classes)

  return {
    ok: true,
    classRecord: target,
    addedCount
  }
}

export function removeClass(classId) {
  const classes = getClasses().filter(c => c.id !== classId)
  saveClasses(classes)

  const affectedProfiles = getAllProfiles().filter(profile => profile.classId === classId)
  for (const profile of affectedProfiles) {
    profile.classId = null
    profile.className = null
    saveProfile(profile)
  }
}

function saveProfileLocalOnly(profile) {
  const normalizedId = normalizeStudentId(profile.studentId)
  const normalized = ensureProfileAuth({
    ...profile,
    studentId: normalizedId
  })

  localStorage.setItem(
    STORAGE_PREFIX + normalized.studentId,
    JSON.stringify(normalized)
  )

  updateStudentsList(normalized.studentId, normalized.name)
}

async function loadProfileFromCloud(studentId, options = {}) {
  if (!CLOUD_ENABLED) return null

  try {
    const headers = {}
    const studentPassword = String(options.studentPassword || '')
    const teacherPassword = String(options.teacherPassword || '')
    if (studentPassword) headers['x-student-password'] = studentPassword
    if (teacherPassword) headers['x-teacher-password'] = teacherPassword

    const response = await fetch(`/api/student/${encodeURIComponent(studentId)}`, Object.keys(headers).length > 0
      ? { headers }
      : undefined)
    if (response.status === 401 && options.failOnUnauthorized) {
      const error = new Error('Unauthorized')
      error.code = 'UNAUTHORIZED'
      throw error
    }
    if (!response.ok) return null
    const data = await response.json()
    const profile = data?.profile || null
    if (!profile) return null
    return ensureProfileAuth({
      ...profile,
      studentId: normalizeStudentId(profile.studentId || studentId)
    })
  } catch (error) {
    if (error?.code === 'UNAUTHORIZED') throw error
    return null
  }
}

async function syncProfileToCloud(profile) {
  if (!CLOUD_ENABLED) return

  try {
    const normalizedId = normalizeStudentId(profile.studentId)
    const headers = {
      'Content-Type': 'application/json'
    }
    const studentSecret = getActiveStudentSessionSecret()
    const teacherToken = getTeacherApiToken()
    if (studentSecret) headers['x-student-password'] = studentSecret
    if (teacherToken) headers['x-teacher-password'] = teacherToken

    await fetch(`/api/student/${encodeURIComponent(normalizedId)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        profile: {
          ...profile,
          studentId: normalizedId
        }
      })
    })
  } catch {
    // no-op
  }
}

function getLastProblemTimestamp(profile) {
  return profile?.recentProblems?.[profile.recentProblems.length - 1]?.timestamp || 0
}

function normalizeCloudListProfile(raw) {
  if (!raw || typeof raw !== 'object') return null

  const studentId = normalizeStudentId(raw.studentId)
  if (!studentId) return null

  return {
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
  }
}

export function exportProfile(studentId) {
  const profile = loadProfile(studentId)
  if (!profile) return null

  return {
    personal_info: {
      studentId: profile.studentId,
      name: profile.name,
      grade: profile.grade
    },
    learning_data: {
      problems_solved: profile.recentProblems,
      statistics: profile.stats
    },
    exported_at: Date.now()
  }
}
