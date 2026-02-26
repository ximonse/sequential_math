/**
 * Storage - Hanterar lagring av elevprofiler, elevinloggning och klasslistor.
 *
 * Phase 1: localStorage
 * Phase 2+: Cloud sync via Vercel API + KV
 */

import { createStudentProfile } from './studentProfile'
import { getTeacherApiToken } from './teacherAuth'
import { migrateProfileOnLoad } from '../engine/profileMigration'
import { normalizeStudentId, getStudentIdCandidates } from './storageStudentId'
import {
  addProfileToClassMembership,
  areClassRecordListsEqual,
  createUniqueStudentId,
  ensureProfileClassMembership,
  getProfileClassIds,
  normalizeClassRecords,
  parseRosterLines,
  profileHasClass,
  removeProfileFromClassMembership
} from './storageClassHelpers'
import {
  ensureProfileAuth,
  setProfilePassword,
  verifyPasswordForProfile
} from './storageAuthHelpers'
import { chooseFreshestProfile } from './storageFreshnessHelpers'
import { createCloudSyncApi } from './storageCloudSync'
import { createStorageClassApi } from './storageClassApi'
import { createStorageStudentApi } from './storageStudentApi'

export { normalizeStudentId } from './storageStudentId'

const STORAGE_PREFIX = 'mathapp_student_'
const STUDENTS_LIST_KEY = 'mathapp_students_list'
const STUDENT_SESSION_KEY = 'mathapp_student_session'
const STUDENT_SESSION_SECRET_KEY = 'mathapp_student_session_secret'
const CLASSES_KEY = 'mathapp_classes_v1'
const CLOUD_ENABLED = import.meta.env.VITE_ENABLE_CLOUD_SYNC === '1'
const CLOUD_FRESHNESS_FUTURE_TOLERANCE_MS = 5 * 60 * 1000
const CLOUD_PROFILE_SYNC_THROTTLE_MS = 90 * 1000
let cloudSyncApi = null
let classApi = null
let studentApi = null

function normalizeLoadedProfile(profile, fallbackStudentId = '') {
  if (!profile || typeof profile !== 'object') return null
  const migrated = migrateProfileOnLoad(profile)
  if (!migrated || typeof migrated !== 'object') return null
  const normalizedId = normalizeStudentId(migrated.studentId || fallbackStudentId)
  if (!normalizedId) return null

  const normalizedProfile = {
    ...migrated,
    studentId: normalizedId
  }
  ensureProfileAuth(normalizedProfile)
  ensureProfileClassMembership(normalizedProfile)
  return normalizedProfile
}

function getCloudSyncApi() {
  if (cloudSyncApi) return cloudSyncApi
  cloudSyncApi = createCloudSyncApi({
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
  })
  return cloudSyncApi
}

function getClassApi() {
  if (classApi) return classApi
  classApi = createStorageClassApi({
    CLASSES_KEY,
    addProfileToClassMembership,
    areClassRecordListsEqual,
    createAndSaveProfile,
    createUniqueStudentId,
    ensureProfileAuth,
    getAllProfiles,
    loadProfile,
    normalizeClassRecords,
    normalizeStudentId,
    parseRosterLines,
    profileHasClass,
    removeProfileFromClassMembership,
    saveProfile
  })
  return classApi
}

function getStudentApi() {
  if (studentApi) return studentApi
  studentApi = createStorageStudentApi({
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
  })
  return studentApi
}

export function getCloudProfilesSyncStatus() {
  return getCloudSyncApi().getCloudProfilesSyncStatus()
}

function requestCloudSync(profile, options = {}) {
  return getCloudSyncApi().requestCloudSync(profile, options)
}

function loadProfileFromCloud(studentId, options = {}) {
  return getCloudSyncApi().loadProfileFromCloud(studentId, options)
}

function syncProfileToCloud(profile) {
  return getCloudSyncApi().syncProfileToCloud(profile)
}

export function loadProfile(studentId) {
  const candidates = getStudentIdCandidates(studentId)
  if (candidates.length === 0) return null

  for (const candidateId of candidates) {
    const data = localStorage.getItem(STORAGE_PREFIX + candidateId)
    if (!data) continue

    try {
      const parsed = JSON.parse(data)
      const normalized = normalizeLoadedProfile(parsed, candidateId)
      if (!normalized) continue
      return normalized
    } catch (e) {
      console.error('Failed to parse profile:', e)
    }
  }

  return null
}

export function saveProfile(profile, options = {}) {
  ensureProfileClassMembership(profile)
  saveProfileLocalOnly(profile)
  requestCloudSync(profile, options)
}

export async function createAndSaveProfile(studentId, name, grade = 4, options = {}) {
  return getStudentApi().createAndSaveProfile(studentId, name, grade, options)
}

export async function getOrCreateProfile(studentId, name = null, grade = 4) {
  return getStudentApi().getOrCreateProfile(studentId, name, grade)
}

export async function getOrCreateProfileWithSync(studentId, name = null, grade = 4, options = {}) {
  return getStudentApi().getOrCreateProfileWithSync(studentId, name, grade, options)
}

export async function authenticateStudent(studentIdInput, passwordInput) {
  return getStudentApi().authenticateStudent(studentIdInput, passwordInput)
}

export async function changeStudentPassword(studentId, currentPassword, newPassword) {
  return getStudentApi().changeStudentPassword(studentId, currentPassword, newPassword)
}

export async function resetStudentPasswordToLoginName(studentId) {
  return getStudentApi().resetStudentPasswordToLoginName(studentId)
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
  const activeId = getActiveStudentSession()
  if (!activeId) return false
  const activeCandidates = new Set(getStudentIdCandidates(activeId))
  const targetCandidates = getStudentIdCandidates(studentId)
  return targetCandidates.some(id => activeCandidates.has(id))
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
  return getCloudSyncApi().getAllProfilesWithSync()
}

export function deleteProfile(studentId) {
  const candidates = getStudentIdCandidates(studentId)
  for (const candidateId of candidates) {
    localStorage.removeItem(STORAGE_PREFIX + candidateId)
  }

  const candidateSet = new Set(candidates)
  const list = getStudentsList().filter((student) => {
    const studentCandidates = getStudentIdCandidates(student.studentId)
    return !studentCandidates.some(id => candidateSet.has(id))
  })
  localStorage.setItem(STUDENTS_LIST_KEY, JSON.stringify(list))
}

export function studentExists(studentId) {
  return loadProfile(studentId) !== null
}

export function getClasses() {
  return getClassApi().getClasses()
}

export async function createClassFromRoster(classNameInput, rosterText, grade = 4) {
  return getClassApi().createClassFromRoster(classNameInput, rosterText, grade)
}

export async function addStudentsToClass(classId, rosterText, grade = 4) {
  return getClassApi().addStudentsToClass(classId, rosterText, grade)
}

export function updateClassExtras(classId, extras) {
  return getClassApi().updateClassExtras(classId, extras)
}

export function removeClass(classId) {
  return getClassApi().removeClass(classId)
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
