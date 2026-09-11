/**
 * Storage - Hanterar lagring av elevprofiler, elevinloggning och klasslistor.
 *
 * Phase 1: localStorage
 * Phase 2+: Cloud sync via Vercel API + KV
 */

import { createStudentProfile } from './studentProfile'
import { isCurrentStudentProfile } from './studentProfileContract'
import { getTeacherApiToken } from './teacherAuth'
import { normalizeStudentId } from './storageStudentId'
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
import { getCachedProfile, getCachedProfiles, putCachedProfile, removeCachedProfile } from './serverDataCache'

export { normalizeStudentId } from './storageStudentId'

const STORAGE_PREFIX = 'mathapp_student_'
const STUDENTS_LIST_KEY = 'mathapp_students_list'
const STUDENT_SESSION_KEY = 'mathapp_student_session'
const STUDENT_SESSION_SECRET_KEY = 'mathapp_student_session_secret'
const STUDENT_ACTIVE_CLASS_KEY = 'mathapp_student_active_class'
const CLOUD_ENABLED = true
const CLOUD_FRESHNESS_FUTURE_TOLERANCE_MS = 5 * 60 * 1000
const CLOUD_PROFILE_SYNC_THROTTLE_MS = 30 * 1000
let cloudSyncApi = null
let classApi = null
let studentApi = null

function normalizeLoadedProfile(profile, fallbackStudentId = '') {
  if (!isCurrentStudentProfile(profile)) return null
  const normalizedId = normalizeStudentId(profile.studentId || fallbackStudentId)
  if (!normalizedId) return null

  const normalizedProfile = {
    ...profile,
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
  classApi = createStorageClassApi({ normalizeClassRecords })
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

export function getSyncHealth() {
  return getCloudSyncApi().getSyncHealth()
}

export function flushPendingSyncs() {
  return getCloudSyncApi().flushPendingSyncs()
}

export function initCloudSyncListeners() {
  return getCloudSyncApi().initCloudSyncListeners()
}

export function destroyCloudSyncListeners() {
  return getCloudSyncApi().destroyCloudSyncListeners()
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

export async function loadTeacherProfile(studentId) {
  const normalizedId = normalizeStudentId(studentId)
  const token = getTeacherApiToken()
  if (!normalizedId || !token) return null
  try {
    const response = await fetch(`/api/teacher-students/${encodeURIComponent(normalizedId)}`, {
      headers: { 'x-teacher-token': token },
      cache: 'no-store'
    })
    if (!response.ok) return null
    const profile = normalizeLoadedProfile((await response.json()).profile, normalizedId)
    return profile ? putCachedProfile(profile) : null
  } catch {
    return null
  }
}

export function loadProfile(studentId) {
  const normalizedId = normalizeStudentId(studentId)
  if (!normalizedId) return null
  const cached = getCachedProfile(normalizedId)
  return cached ? normalizeLoadedProfile(cached, normalizedId) : null
}

export function saveProfile(profile, options = {}) {
  if (!isCurrentStudentProfile(profile) || profile.teacherListSchemaVersion) {
    throw new Error('Only complete student profiles can be saved')
  }
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

export async function moveStudentBetweenClasses(studentId, fromClassId, toClassId) {
  if (!CLOUD_ENABLED || !getTeacherApiToken()) return { ok: false, error: 'Logga in som lärare igen.' }
  try {
    const response = await fetch(`/api/student/${encodeURIComponent(normalizeStudentId(studentId))}/class-membership`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() },
      body: JSON.stringify({ fromClassId, toClassId })
    })
    const data = await response.json()
    return response.ok ? { ok: true, profile: data.profile } : { ok: false, error: data.error || 'Kunde inte flytta eleven.' }
  } catch { return { ok: false, error: 'Kunde inte kontakta servern.' } }
}

export function setActiveStudentSession(studentId, sessionSecret = '', options = {}) {
  const normalizedId = normalizeStudentId(studentId)
  if (!normalizedId) return
  const store = options.remember === true ? localStorage : sessionStorage
  for (const candidate of [localStorage, sessionStorage]) {
    candidate.removeItem(STUDENT_SESSION_KEY); candidate.removeItem(STUDENT_SESSION_SECRET_KEY); candidate.removeItem(STUDENT_ACTIVE_CLASS_KEY)
  }
  store.setItem(STUDENT_SESSION_KEY, normalizedId)
  store.setItem(STUDENT_SESSION_SECRET_KEY, String(sessionSecret || ''))
}

export function setActiveStudentClass(classId) {
  const normalized = String(classId || '').trim()
  if (!normalized) return false
  const store = localStorage.getItem(STUDENT_SESSION_KEY) ? localStorage : sessionStorage
  store.setItem(STUDENT_ACTIVE_CLASS_KEY, normalized)
  return true
}

export function getActiveStudentClass(profile) {
  const selected = String(localStorage.getItem(STUDENT_ACTIVE_CLASS_KEY) || sessionStorage.getItem(STUDENT_ACTIVE_CLASS_KEY) || '').trim()
  const assigned = new Set([profile?.classId, ...(Array.isArray(profile?.classIds) ? profile.classIds : [])]
    .map(value => String(value || '').trim())
    .filter(Boolean))
  return selected && assigned.has(selected) ? selected : ''
}

export function clearActiveStudentSession() {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(STUDENT_SESSION_KEY); store.removeItem(STUDENT_SESSION_SECRET_KEY); store.removeItem(STUDENT_ACTIVE_CLASS_KEY)
  }
}

export function getActiveStudentSession() {
  return normalizeStudentId(localStorage.getItem(STUDENT_SESSION_KEY) || sessionStorage.getItem(STUDENT_SESSION_KEY) || '')
}

export function getActiveStudentSessionSecret() {
  return String(localStorage.getItem(STUDENT_SESSION_SECRET_KEY) || sessionStorage.getItem(STUDENT_SESSION_SECRET_KEY) || '')
}

export function isStudentSessionActive(studentId) {
  const activeId = getActiveStudentSession()
  if (!activeId) return false
  return activeId === normalizeStudentId(studentId)
    && String(localStorage.getItem(STUDENT_ACTIVE_CLASS_KEY) || sessionStorage.getItem(STUDENT_ACTIVE_CLASS_KEY) || '').trim() !== ''
}

function updateStudentsList() {
  // Student indexes belong to the server. The open page only keeps a memory
  // cache, so a browser quota can never affect pupil data.
}

export function getStudentsList() {
  return getCachedProfiles().map(profile => ({
    studentId: profile.studentId,
    name: profile.name,
    lastActive: Number(profile.auth?.lastLoginAt || 0)
  }))
}

export function getAllProfiles() {
  return getCachedProfiles()
}

export async function getAllProfilesWithSync() {
  return getCloudSyncApi().getAllProfilesWithSync()
}

export async function deleteProfile(studentId) {
  const normalizedId = normalizeStudentId(studentId)
  if (!normalizedId) return { ok: false, error: 'Kunde inte lasa elev-ID.' }

  const cloudResult = await getCloudSyncApi().deleteProfileFromCloud(normalizedId)
  if (!cloudResult.ok) return cloudResult

  removeCachedProfile(normalizedId)
  if (isStudentSessionActive(normalizedId)) clearActiveStudentSession()

  for (const classRecord of getClasses()) {
    const studentIds = Array.isArray(classRecord.studentIds) ? classRecord.studentIds : []
    if (studentIds.some(id => normalizeStudentId(id) === normalizedId)) {
      saveClass({
        ...classRecord,
        studentIds: studentIds.filter(id => normalizeStudentId(id) !== normalizedId)
      })
    }
  }

  return { ok: true }
}

export function studentExists(studentId) {
  return loadProfile(studentId) !== null
}

export function getClasses() {
  return getClassApi().getClasses()
}

export async function createClassFromRoster(classNameInput, rosterText, grade = 4, schoolId = '') {
  return getClassApi().createClassFromRoster(classNameInput, rosterText, grade, schoolId)
}

export async function addStudentsToClass(classId, rosterText, grade = 4) {
  return getClassApi().addStudentsToClass(classId, rosterText, grade)
}

export async function addExistingStudentsToClass(classId, studentIds, grade = 4) {
  return getClassApi().addExistingStudentsToClass(classId, studentIds, grade)
}

export function updateClassExtras(classId, extras) {
  return getClassApi().updateClassExtras(classId, extras)
}

export function removeClass(classId) {
  return getClassApi().removeClass(classId)
}

export function saveClass(classRecord) {
  return getClassApi().saveClass(classRecord)
}

function saveProfileLocalOnly(profile) {
  const normalizedId = normalizeStudentId(profile.studentId)
  const normalized = ensureProfileClassMembership(ensureProfileAuth({
    ...profile,
    studentId: normalizedId
  }))

  putCachedProfile(normalized)
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
