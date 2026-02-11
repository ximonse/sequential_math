/**
 * Storage - Hanterar lagring av elevprofiler
 *
 * Phase 1: localStorage
 * Phase 2+: Cloud sync via Vercel API + KV
 */

import { createStudentProfile } from './studentProfile'

const STORAGE_PREFIX = 'mathapp_student_'
const STUDENTS_LIST_KEY = 'mathapp_students_list'
const CLOUD_ENABLED = import.meta.env.VITE_ENABLE_CLOUD_SYNC === '1'

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
  saveProfileLocalOnly(profile)
  // Best-effort sync, blockera aldrig elevflödet.
  void syncProfileToCloud(profile)
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
 * Hämta/skapa profil med cloud-fallback för delad data mellan enheter.
 */
export async function getOrCreateProfileWithSync(studentId, name = null, grade = 4) {
  const local = loadProfile(studentId)
  if (local) {
    void syncProfileToCloud(local)
    return local
  }

  if (CLOUD_ENABLED) {
    const cloud = await loadProfileFromCloud(studentId)
    if (cloud) {
      saveProfileLocalOnly(cloud)
      return cloud
    }
  }

  const displayName = name || `Elev ${studentId}`
  return createAndSaveProfile(studentId, displayName, grade)
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
 * Hämta alla profiler med cloud merge (lärarvy).
 */
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
    for (const p of cloud) {
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

function saveProfileLocalOnly(profile) {
  localStorage.setItem(
    STORAGE_PREFIX + profile.studentId,
    JSON.stringify(profile)
  )
  updateStudentsList(profile.studentId, profile.name)
}

async function loadProfileFromCloud(studentId) {
  if (!CLOUD_ENABLED) return null
  try {
    const response = await fetch(`/api/student/${encodeURIComponent(studentId)}`)
    if (!response.ok) return null
    const data = await response.json()
    return data?.profile || null
  } catch {
    return null
  }
}

async function syncProfileToCloud(profile) {
  if (!CLOUD_ENABLED) return
  try {
    await fetch(`/api/student/${encodeURIComponent(profile.studentId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile })
    })
  } catch {
    // no-op
  }
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
