/**
 * Storage - Hanterar lagring av elevprofiler, elevinloggning och klasslistor.
 *
 * Phase 1: localStorage
 * Phase 2+: Cloud sync via Vercel API + KV
 */

import { createStudentProfile } from './studentProfile'

const STORAGE_PREFIX = 'mathapp_student_'
const STUDENTS_LIST_KEY = 'mathapp_students_list'
const STUDENT_SESSION_KEY = 'mathapp_student_session'
const CLASSES_KEY = 'mathapp_classes_v1'
const CLOUD_ENABLED = import.meta.env.VITE_ENABLE_CLOUD_SYNC === '1'

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

  if (!profile.auth.password || String(profile.auth.password).trim() === '') {
    profile.auth.password = profile.name || profile.studentId
  }

  if (typeof profile.auth.loginCount !== 'number') {
    profile.auth.loginCount = 0
  }

  if (!('lastLoginAt' in profile.auth)) {
    profile.auth.lastLoginAt = null
  }

  return profile
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

export function createAndSaveProfile(studentId, name, grade = 4, options = {}) {
  const normalizedId = normalizeStudentId(studentId)
  if (!normalizedId) {
    throw new Error('Invalid student id')
  }

  const displayName = String(name || normalizedId).trim() || normalizedId
  const profile = createStudentProfile(normalizedId, displayName, grade)

  profile.auth = {
    password: String(options.initialPassword || displayName),
    passwordUpdatedAt: Date.now(),
    lastLoginAt: null,
    loginCount: 0
  }

  profile.classId = options.classId || null
  profile.className = options.className || null

  saveProfile(profile)
  return profile
}

export function getOrCreateProfile(studentId, name = null, grade = 4) {
  const normalizedId = normalizeStudentId(studentId)
  let profile = loadProfile(normalizedId)

  if (!profile) {
    const displayName = name || `Elev ${normalizedId}`
    profile = createAndSaveProfile(normalizedId, displayName, grade)
  }

  ensureProfileAuth(profile)
  return profile
}

export async function getOrCreateProfileWithSync(studentId, name = null, grade = 4) {
  const normalizedId = normalizeStudentId(studentId)
  const local = loadProfile(normalizedId)
  if (local) {
    void syncProfileToCloud(local)
    return local
  }

  if (CLOUD_ENABLED) {
    const cloud = await loadProfileFromCloud(normalizedId)
    if (cloud) {
      saveProfileLocalOnly(cloud)
      return cloud
    }
  }

  const displayName = name || `Elev ${normalizedId}`
  return createAndSaveProfile(normalizedId, displayName, grade)
}

export function authenticateStudent(studentIdInput, passwordInput) {
  const studentId = normalizeStudentId(studentIdInput)
  const password = String(passwordInput || '')

  if (!studentId) {
    return { ok: false, error: 'Ange inloggningsnamn.' }
  }

  if (password.trim() === '') {
    return { ok: false, error: 'Ange lösenord.' }
  }

  let profile = loadProfile(studentId)
  if (!profile) {
    profile = createAndSaveProfile(studentId, studentId, 4, {
      initialPassword: studentId
    })
  }

  ensureProfileAuth(profile)

  if (password !== String(profile.auth.password || '')) {
    return { ok: false, error: 'Fel lösenord.' }
  }

  profile.auth.lastLoginAt = Date.now()
  profile.auth.loginCount = (profile.auth.loginCount || 0) + 1
  saveProfile(profile)
  setActiveStudentSession(studentId)

  return { ok: true, profile }
}

export function changeStudentPassword(studentId, currentPassword, newPassword) {
  const profile = loadProfile(studentId)
  if (!profile) return { ok: false, error: 'Elev saknas.' }

  ensureProfileAuth(profile)

  if (String(currentPassword || '') !== String(profile.auth.password || '')) {
    return { ok: false, error: 'Nuvarande lösenord stämmer inte.' }
  }

  if (String(newPassword || '').trim().length < 3) {
    return { ok: false, error: 'Nytt lösenord måste vara minst 3 tecken.' }
  }

  profile.auth.password = String(newPassword)
  profile.auth.passwordUpdatedAt = Date.now()
  saveProfile(profile)
  return { ok: true }
}

export function resetStudentPasswordToLoginName(studentId) {
  const profile = loadProfile(studentId)
  if (!profile) return { ok: false, error: 'Elev saknas.' }

  ensureProfileAuth(profile)
  profile.auth.password = profile.studentId
  profile.auth.passwordUpdatedAt = Date.now()
  saveProfile(profile)
  return { ok: true }
}

export function setActiveStudentSession(studentId) {
  const normalizedId = normalizeStudentId(studentId)
  if (!normalizedId) return
  localStorage.setItem(STUDENT_SESSION_KEY, normalizedId)
}

export function clearActiveStudentSession() {
  localStorage.removeItem(STUDENT_SESSION_KEY)
}

export function getActiveStudentSession() {
  return normalizeStudentId(localStorage.getItem(STUDENT_SESSION_KEY) || '')
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
    const response = await fetch('/api/students')
    if (!response.ok) return local
    const data = await response.json()
    const cloud = Array.isArray(data?.profiles) ? data.profiles : []

    const merged = new Map()
    for (const p of local) merged.set(p.studentId, p)

    for (const raw of cloud) {
      const p = ensureProfileAuth({ ...raw, studentId: normalizeStudentId(raw.studentId) })
      const prev = merged.get(p.studentId)
      if (!prev) {
        merged.set(p.studentId, p)
      } else {
        const prevTs = prev.recentProblems?.[prev.recentProblems.length - 1]?.timestamp || 0
        const cloudTs = p.recentProblems?.[p.recentProblems.length - 1]?.timestamp || 0
        merged.set(p.studentId, cloudTs >= prevTs ? p : prev)
      }
      saveProfileLocalOnly(p)
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

export function createClassFromRoster(classNameInput, rosterText, grade = 4) {
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
    const created = createAndSaveProfile(uniqueId, name, grade, {
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

export function addStudentsToClass(classId, rosterText, grade = 4) {
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
    const created = createAndSaveProfile(uniqueId, name, grade, {
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

async function loadProfileFromCloud(studentId) {
  if (!CLOUD_ENABLED) return null

  try {
    const response = await fetch(`/api/student/${encodeURIComponent(studentId)}`)
    if (!response.ok) return null
    const data = await response.json()
    const profile = data?.profile || null
    if (!profile) return null
    return ensureProfileAuth({
      ...profile,
      studentId: normalizeStudentId(profile.studentId || studentId)
    })
  } catch {
    return null
  }
}

async function syncProfileToCloud(profile) {
  if (!CLOUD_ENABLED) return

  try {
    const normalizedId = normalizeStudentId(profile.studentId)
    await fetch(`/api/student/${encodeURIComponent(normalizedId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
