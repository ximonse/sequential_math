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
const CLOUD_FRESHNESS_FUTURE_TOLERANCE_MS = 5 * 60 * 1000

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

function ensureProfileClassMembership(profile) {
  if (!profile || typeof profile !== 'object') return profile

  const seen = new Set()
  const classIds = []
  const pushClassId = (value) => {
    const id = String(value || '').trim()
    if (!id || seen.has(id)) return
    seen.add(id)
    classIds.push(id)
  }

  pushClassId(profile.classId)
  if (Array.isArray(profile.classIds)) {
    for (const value of profile.classIds) {
      pushClassId(value)
    }
  }

  profile.classIds = classIds
  profile.classId = classIds[0] || null
  if (!profile.classId) {
    profile.className = null
  } else if (typeof profile.className === 'string') {
    const trimmed = profile.className.trim()
    profile.className = trimmed === '' ? null : trimmed
  }

  return profile
}

function getProfileClassIds(profile) {
  if (!profile || typeof profile !== 'object') return []
  const normalized = ensureProfileClassMembership(profile)
  return Array.isArray(normalized.classIds) ? normalized.classIds : []
}

function profileHasClass(profile, classId) {
  const target = String(classId || '').trim()
  if (!target) return false
  return getProfileClassIds(profile).includes(target)
}

function addProfileToClassMembership(profile, classRecord) {
  if (!profile || typeof profile !== 'object') return false
  const classId = String(classRecord?.id || '').trim()
  if (!classId) return false

  ensureProfileClassMembership(profile)
  if (!Array.isArray(profile.classIds)) profile.classIds = []

  if (!profile.classIds.includes(classId)) {
    profile.classIds.push(classId)
  }

  const className = String(classRecord?.name || '').trim()
  if (!profile.classId) {
    profile.classId = classId
    profile.className = className || null
  } else if (profile.classId === classId && className) {
    profile.className = className
  }

  ensureProfileClassMembership(profile)
  return true
}

function removeProfileFromClassMembership(profile, classId, classNameById = new Map()) {
  if (!profile || typeof profile !== 'object') return false
  const target = String(classId || '').trim()
  if (!target) return false

  ensureProfileClassMembership(profile)
  if (!Array.isArray(profile.classIds) || profile.classIds.length === 0) {
    profile.classId = null
    profile.className = null
    return false
  }

  const before = profile.classIds.length
  profile.classIds = profile.classIds.filter(id => id !== target)
  const changed = profile.classIds.length !== before
  if (!changed) return false

  if (profile.classIds.length === 0) {
    profile.classId = null
    profile.className = null
    return true
  }

  if (profile.classId === target || !profile.classIds.includes(profile.classId)) {
    const nextPrimary = profile.classIds[0]
    profile.classId = nextPrimary
    profile.className = classNameById.get(nextPrimary) || null
  }

  ensureProfileClassMembership(profile)
  return true
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
    ensureProfileClassMembership(parsed)
    return parsed
  } catch (e) {
    console.error('Failed to parse profile:', e)
    return null
  }
}

export function saveProfile(profile) {
  ensureProfileClassMembership(profile)
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
  profile.classIds = options.classId ? [String(options.classId)] : []
  ensureProfileClassMembership(profile)

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
    if (CLOUD_ENABLED) {
      const cloud = await loadProfileFromCloud(normalizedId, {
        studentPassword: getActiveStudentSessionSecret(),
        teacherPassword: getTeacherApiToken()
      })

      if (cloud) {
        const freshest = chooseFreshestProfile(local, cloud)
        saveProfileLocalOnly(freshest)
        if (freshest === local) {
          void syncProfileToCloud(local)
        }
        return freshest
      }

      void syncProfileToCloud(local)
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

  if (CLOUD_ENABLED) {
    try {
      const cloudProfile = await loadProfileFromCloud(studentId, {
        studentPassword: password,
        failOnUnauthorized: true
      })
      if (cloudProfile) {
        profile = chooseFreshestProfile(profile, cloudProfile)
        saveProfileLocalOnly(profile)
      }
    } catch (error) {
      if (error?.code === 'UNAUTHORIZED') {
        return { ok: false, error: 'Fel lösenord.' }
      }
      // Behåll lokal inloggning om cloud tillfälligt inte svarar.
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
  setActiveStudentSession(studentId, password)
  saveProfile(profile)

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
  saveProfile(profile)
  if (isStudentSessionActive(normalizedId)) {
    setActiveStudentSession(normalizedId, profile.studentId)
  }
  return { ok: true, password: profile.studentId }
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
    const requestOptions = {
      cache: 'no-store'
    }
    if (teacherApiToken) {
      requestOptions.headers = { 'x-teacher-password': teacherApiToken }
    }
    const response = await fetch('/api/students', requestOptions)
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
        merged.set(p.studentId, chooseFreshestProfile(prev, p))
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
    if (!Array.isArray(parsed)) return []
    const normalized = normalizeClassRecords(parsed)
    if (!areClassRecordListsEqual(parsed, normalized)) {
      saveClasses(normalized)
    }
    return normalized
  } catch {
    return []
  }
}

function saveClasses(classes) {
  const normalized = normalizeClassRecords(classes)
  localStorage.setItem(CLASSES_KEY, JSON.stringify(normalized))
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
  const studentIds = new Set()
  const classRecord = {
    id: classId,
    name: className
  }

  for (const name of names) {
    const base = normalizeStudentId(name)
    if (!base) continue

    let profile = loadProfile(base)
    if (profile) {
      profile.name = name
      ensureProfileAuth(profile)
      addProfileToClassMembership(profile, classRecord)
      saveProfile(profile)
      studentIds.add(profile.studentId)
      continue
    }

    const uniqueId = createUniqueStudentId(base, existingIds)
    const created = await createAndSaveProfile(uniqueId, name, grade, {
      initialPassword: name,
      classId,
      className
    })
    studentIds.add(created.studentId)
  }

  const finalClassRecord = {
    id: classId,
    name: className,
    studentIds: Array.from(studentIds),
    createdAt: Date.now()
  }

  classes.unshift(finalClassRecord)
  saveClasses(classes)

  return {
    ok: true,
    classRecord: finalClassRecord
  }
}

export async function addStudentsToClass(classId, rosterText, grade = 4) {
  const targetClassId = String(classId || '').trim()
  if (!targetClassId) {
    return { ok: false, error: 'Välj en klass att lägga till elever i.' }
  }

  const classes = getClasses()
  const target = classes.find(item => String(item.id || '').trim() === targetClassId)
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
      const wasInClass = profileHasClass(profile, target.id)
      addProfileToClassMembership(profile, target)
      saveProfile(profile)
      if (!studentIds.has(profile.studentId)) {
        studentIds.add(profile.studentId)
      }
      if (!wasInClass) {
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
  const targetClassId = String(classId || '').trim()
  if (!targetClassId) return

  const classes = getClasses().filter(c => String(c.id || '').trim() !== targetClassId)
  saveClasses(classes)

  const classNameById = new Map(classes.map(item => [item.id, item.name]))
  const affectedProfiles = getAllProfiles().filter(profile => profileHasClass(profile, targetClassId))
  for (const profile of affectedProfiles) {
    if (removeProfileFromClassMembership(profile, targetClassId, classNameById)) {
      saveProfile(profile)
    }
  }
}

function normalizeClassRecords(classes) {
  if (!Array.isArray(classes)) return []
  const normalized = []
  const seen = new Set()

  for (const record of classes) {
    if (!record || typeof record !== 'object') continue
    const classId = String(record.id || '').trim()
    if (!classId || seen.has(classId)) continue
    seen.add(classId)

    const className = String(record.name || '').trim() || classId
    const studentIds = Array.isArray(record.studentIds)
      ? Array.from(new Set(
          record.studentIds
            .map(studentId => normalizeStudentId(studentId))
            .filter(Boolean)
        ))
      : []

    normalized.push({
      ...record,
      id: classId,
      name: className,
      studentIds
    })
  }

  return normalized
}

function areClassRecordListsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index]
    const right = b[index]
    if (!left || !right) return false
    if (String(left.id || '').trim() !== String(right.id || '').trim()) return false
    if (String(left.name || '').trim() !== String(right.name || '').trim()) return false

    const leftStudentIds = Array.isArray(left.studentIds) ? left.studentIds : []
    const rightStudentIds = Array.isArray(right.studentIds) ? right.studentIds : []
    if (leftStudentIds.length !== rightStudentIds.length) return false
    for (let i = 0; i < leftStudentIds.length; i += 1) {
      if (String(leftStudentIds[i] || '').trim() !== String(rightStudentIds[i] || '').trim()) {
        return false
      }
    }
  }

  return true
}

function saveProfileLocalOnly(profile) {
  const normalizedId = normalizeStudentId(profile.studentId)
  const normalized = ensureProfileClassMembership(ensureProfileAuth({
    ...profile,
    studentId: normalizedId
  }))

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

    const requestOptions = {
      cache: 'no-store'
    }
    if (Object.keys(headers).length > 0) {
      requestOptions.headers = headers
    }

    const response = await fetch(`/api/student/${encodeURIComponent(studentId)}`, requestOptions)
    if (response.status === 401 && options.failOnUnauthorized) {
      const error = new Error('Unauthorized')
      error.code = 'UNAUTHORIZED'
      throw error
    }
    if (!response.ok) return null
    const data = await response.json()
    const profile = data?.profile || null
    if (!profile) return null
    return ensureProfileClassMembership(ensureProfileAuth({
      ...profile,
      studentId: normalizeStudentId(profile.studentId || studentId)
    }))
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
    if (!response.ok) return
  } catch {
    // no-op
  }
}

function normalizeFreshnessTimestamp(value, now = Date.now()) {
  const ts = Number(value)
  if (!Number.isFinite(ts) || ts <= 0) return 0
  if (ts > (now + CLOUD_FRESHNESS_FUTURE_TOLERANCE_MS)) return 0
  return Math.min(ts, now)
}

function getMaxTimestampFromEntries(entries, now = Date.now()) {
  if (!Array.isArray(entries) || entries.length === 0) return 0
  let maxTs = 0
  for (const entry of entries) {
    const ts = normalizeFreshnessTimestamp(entry?.timestamp, now)
    if (ts > maxTs) maxTs = ts
  }
  return maxTs
}

function getLastProblemTimestamp(profile, now = Date.now()) {
  const fromRecent = getMaxTimestampFromEntries(profile?.recentProblems, now)
  const fromProblemLog = getMaxTimestampFromEntries(profile?.problemLog, now)
  return Math.max(fromRecent, fromProblemLog)
}

function getLastTableCompletionTimestamp(profile, now = Date.now()) {
  const completions = profile?.tableDrill?.completions
  if (!Array.isArray(completions) || completions.length === 0) return 0
  let maxTs = 0
  for (const item of completions) {
    const ts = normalizeFreshnessTimestamp(item?.timestamp, now)
    if (ts > maxTs) maxTs = ts
  }
  return maxTs
}

function getLastPresenceSignalTimestamp(profile, now = Date.now()) {
  const activity = profile?.activity && typeof profile.activity === 'object'
    ? profile.activity
    : {}
  return Math.max(
    normalizeFreshnessTimestamp(activity.lastPresenceAt, now),
    normalizeFreshnessTimestamp(activity.lastInteractionAt, now)
  )
}

function getLastLoginSignalTimestamp(profile, now = Date.now()) {
  return normalizeFreshnessTimestamp(profile?.auth?.lastLoginAt, now)
}

function getProblemCountSignal(profile) {
  const recentCount = Array.isArray(profile?.recentProblems) ? profile.recentProblems.length : 0
  const logCount = Array.isArray(profile?.problemLog) ? profile.problemLog.length : 0
  const lifetimeCount = Number(profile?.stats?.lifetimeProblems ?? profile?.stats?.totalProblems ?? 0)
  const normalizedLifetime = Number.isFinite(lifetimeCount) ? Math.max(0, lifetimeCount) : 0
  return Math.max(recentCount, logCount, normalizedLifetime)
}

function getTableCompletionCountSignal(profile) {
  const completions = profile?.tableDrill?.completions
  if (!Array.isArray(completions)) return 0
  return completions.length
}

function getProfileFreshnessTimestamp(profile, now = Date.now()) {
  return Math.max(
    getLastTicketSignalTimestamp(profile, now),
    getLastProblemTimestamp(profile, now),
    getLastTableCompletionTimestamp(profile, now),
    getLastPresenceSignalTimestamp(profile, now),
    getLastLoginSignalTimestamp(profile, now)
  )
}

function getLastTicketSignalTimestamp(profile, now = Date.now()) {
  const inbox = profile?.ticketInbox && typeof profile.ticketInbox === 'object'
    ? profile.ticketInbox
    : null
  const inboxTs = Math.max(
    normalizeFreshnessTimestamp(inbox?.updatedAt, now),
    normalizeFreshnessTimestamp(inbox?.publishedAt, now),
    normalizeFreshnessTimestamp(inbox?.clearedAt, now)
  )

  const responses = Array.isArray(profile?.ticketResponses) ? profile.ticketResponses : []
  let responseTs = 0
  for (const item of responses) {
    const ts = normalizeFreshnessTimestamp(item?.answeredAt, now)
    if (ts > responseTs) responseTs = ts
  }

  return Math.max(inboxTs, responseTs)
}

function chooseFreshestProfile(localProfile, cloudProfile) {
  const now = Date.now()
  const localFreshness = getProfileFreshnessTimestamp(localProfile, now)
  const cloudFreshness = getProfileFreshnessTimestamp(cloudProfile, now)
  if (cloudFreshness > localFreshness) return cloudProfile
  if (cloudFreshness < localFreshness) return localProfile

  const localProblemCount = getProblemCountSignal(localProfile)
  const cloudProblemCount = getProblemCountSignal(cloudProfile)
  if (cloudProblemCount > localProblemCount) return cloudProfile
  if (cloudProblemCount < localProblemCount) return localProfile

  const localTableCompletions = getTableCompletionCountSignal(localProfile)
  const cloudTableCompletions = getTableCompletionCountSignal(cloudProfile)
  if (cloudTableCompletions > localTableCompletions) return cloudProfile
  if (cloudTableCompletions < localTableCompletions) return localProfile

  const localPwdTs = Number(localProfile?.auth?.passwordUpdatedAt || 0)
  const cloudPwdTs = Number(cloudProfile?.auth?.passwordUpdatedAt || 0)
  if (cloudPwdTs > localPwdTs) return cloudProfile
  if (cloudPwdTs < localPwdTs) return localProfile

  const localClassCount = getProfileClassIds(localProfile).length
  const cloudClassCount = getProfileClassIds(cloudProfile).length
  if (cloudClassCount > localClassCount) return cloudProfile
  if (cloudClassCount < localClassCount) return localProfile

  if (!localProfile?.classId && cloudProfile?.classId) return cloudProfile
  if (!localProfile?.className && cloudProfile?.className) return cloudProfile
  return localProfile
}

function normalizeCloudListProfile(raw) {
  if (!raw || typeof raw !== 'object') return null

  const studentId = normalizeStudentId(raw.studentId)
  if (!studentId) return null

  return ensureProfileClassMembership({
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
  })
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
      problem_log: Array.isArray(profile.problemLog) ? profile.problemLog : [],
      statistics: profile.stats
    },
    exported_at: Date.now()
  }
}
