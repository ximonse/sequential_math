import { createStudentProfile } from '../lib/studentProfile'
import {
  loadProfile,
  saveClass,
  saveProfile,
  setActiveStudentClass,
  setActiveStudentSession
} from '../lib/storage'

export const ADAPTIVE_QA_STUDENT_ID = 'QA'
export const ADAPTIVE_QA_CLASS_ID = 'qa-adaptive-class'
export const ADAPTIVE_QA_CLASS_NAME = 'QA adaptivitet'

export function createAdaptiveQaProfile(now = Date.now()) {
  const profile = createStudentProfile(ADAPTIVE_QA_STUDENT_ID, 'QA-elev', 6)
  profile.created_at = now
  profile.classId = ADAPTIVE_QA_CLASS_ID
  profile.classIds = [ADAPTIVE_QA_CLASS_ID]
  profile.className = ADAPTIVE_QA_CLASS_NAME
  return profile
}

export function installAdaptiveQaFixture({ reset = false, now = Date.now() } = {}) {
  if (!import.meta.env.DEV) throw new Error('QA-fixturen får bara användas i utvecklingsläge.')
  if (import.meta.env.VITE_ENABLE_CLOUD_SYNC === '1') {
    throw new Error('QA-fixturen kräver avstängd molnsynk.')
  }

  let profile = reset ? null : loadProfile(ADAPTIVE_QA_STUDENT_ID)
  if (!profile) {
    profile = createAdaptiveQaProfile(now)
    saveProfile(profile)
  }

  saveClass({
    id: ADAPTIVE_QA_CLASS_ID,
    name: ADAPTIVE_QA_CLASS_NAME,
    grade: 6,
    studentIds: [ADAPTIVE_QA_STUDENT_ID],
    enabledExtras: []
  })
  setActiveStudentSession(ADAPTIVE_QA_STUDENT_ID, 'local-qa-session')
  setActiveStudentClass(ADAPTIVE_QA_CLASS_ID)
  return profile
}
