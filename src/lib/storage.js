/**
 * Storage - Hanterar lagring av elevprofiler
 *
 * Phase 1: localStorage
 * Phase 2+: Vercel KV
 */

import { createStudentProfile } from './studentProfile'

const STORAGE_PREFIX = 'mathapp_student_'
const STUDENTS_LIST_KEY = 'mathapp_students_list'

/**
 * Ladda elevprofil
 */
export function loadProfile(studentId) {
  const data = localStorage.getItem(STORAGE_PREFIX + studentId)

  if (!data) {
    return null
  }

  try {
    return JSON.parse(data)
  } catch (e) {
    console.error('Failed to parse profile:', e)
    return null
  }
}

/**
 * Spara elevprofil
 */
export function saveProfile(profile) {
  localStorage.setItem(
    STORAGE_PREFIX + profile.studentId,
    JSON.stringify(profile)
  )

  // Uppdatera listan över elever
  updateStudentsList(profile.studentId, profile.name)
}

/**
 * Skapa ny elevprofil
 */
export function createAndSaveProfile(studentId, name, grade = 4) {
  const profile = createStudentProfile(studentId, name, grade)
  saveProfile(profile)
  return profile
}

/**
 * Hämta eller skapa profil
 */
export function getOrCreateProfile(studentId, name = null, grade = 4) {
  let profile = loadProfile(studentId)

  if (!profile) {
    const displayName = name || `Elev ${studentId}`
    profile = createAndSaveProfile(studentId, displayName, grade)
  }

  return profile
}

/**
 * Uppdatera listan över elever
 */
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

/**
 * Hämta lista över alla elever
 */
export function getStudentsList() {
  const data = localStorage.getItem(STUDENTS_LIST_KEY)
  if (!data) return []

  try {
    return JSON.parse(data)
  } catch (e) {
    return []
  }
}

/**
 * Hämta alla elevprofiler (för dashboard)
 */
export function getAllProfiles() {
  const list = getStudentsList()
  return list.map(s => loadProfile(s.studentId)).filter(Boolean)
}

/**
 * Ta bort elevprofil
 */
export function deleteProfile(studentId) {
  localStorage.removeItem(STORAGE_PREFIX + studentId)

  const list = getStudentsList().filter(s => s.studentId !== studentId)
  localStorage.setItem(STUDENTS_LIST_KEY, JSON.stringify(list))
}

/**
 * Kontrollera om elev-ID finns
 */
export function studentExists(studentId) {
  return loadProfile(studentId) !== null
}

/**
 * Exportera profil (för GDPR)
 */
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
