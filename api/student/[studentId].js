import { hashPasswordWithSalt, verifyStudentCredential } from '../_studentPassword.js'
import { kv } from '@vercel/kv'
import { isStudentDeleted, mutateStudentRecord, studentStoreError } from '../_studentStore.js'
import { assertTeacherStudentAccess } from '../_studentAccess.js'
import {
  getLiveTeacherAuthPayload,
  isLiveTeacherApiAuthorized,
  withCors
} from '../_helpers.js'
import { withFreshTeacherSummary } from '../../src/lib/teacherSummary.js'
import { removeStudentHighscores } from '../highscores.js'
import { isSchoolAdminRole } from '../_teacherRoles.js'
import {
  STUDENT_PASSWORD_SCHEME,
  hasCurrentStudentPassword,
  isCurrentStudentProfile
} from '../../src/lib/studentProfileContract.js'
import {
  createSaltHex,
  mergeProfiles,
  normalizeProfileForStorage
} from './_profileMerge.js'

function addLegacyClassAttribution(profile) {
  const fallbackClassId = String(profile?.classId || profile?.classIds?.[0] || '').trim() || null
  const attribute = entries => Array.isArray(entries) ? entries.map(entry => (
    entry?.classIdAtAttempt
      ? entry
      : { ...entry, classIdAtAttempt: fallbackClassId, classIdAtAttemptInferred: true }
  )) : entries
  return { ...profile, problemLog: attribute(profile?.problemLog), recentProblems: attribute(profile?.recentProblems) }
}

export function sanitizeStudentProfileForResponse(profile) {
  if (!profile || typeof profile !== 'object') return profile
  const safe = { ...profile }
  if (safe.auth && typeof safe.auth === 'object') {
    safe.auth = {
      lastLoginAt: safe.auth.lastLoginAt || null,
      loginCount: Number(safe.auth.loginCount) || 0,
      passwordUpdatedAt: safe.auth.passwordUpdatedAt || null
    }
  }
  delete safe.session
  delete safe.sessionId
  return safe
}

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,PATCH,DELETE,OPTIONS', headers: 'Content-Type, x-student-password, x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const studentId = String(req.query.studentId || '').trim().toUpperCase()
  if (!studentId) return res.status(400).json({ error: 'Missing studentId' })

  try {
    const stored = await kv.get(`student:${studentId}`)
    const existing = isCurrentStudentProfile(stored) ? stored : null
    const teacherAuthorized = await isLiveTeacherApiAuthorized(req)
    const studentPassword = String(req.headers['x-student-password'] || '')

    if (req.method === 'DELETE') {
      const deleteAuth = await getLiveTeacherAuthPayload(req)
      if (!deleteAuth) return res.status(401).json({ error: 'Teacher authorization required' })
      if (!isSchoolAdminRole(deleteAuth.role, deleteAuth.isAdmin)) return res.status(403).json({ error: 'Endast administratörer kan radera elever permanent.' })
      let deletedClassIds = []
      await mutateStudentRecord(studentId, async current => {
        await assertTeacherStudentAccess(req, current)
        deletedClassIds = [current?.classId, ...(current?.classIds || [])].filter(Boolean)
        return null
      })
      let highscoreCleanup = 'complete'
      try { await removeStudentHighscores(studentId, deletedClassIds) } catch { highscoreCleanup = 'pending' }
      return res.status(200).json({ ok: true, deleted: true, highscoreCleanup })
    }

    if (req.method === 'GET') {
      if (await isStudentDeleted(studentId)) return res.status(410).json({ error: 'Student deleted' })
      if (stored && !existing) return res.status(409).json({ error: 'Unsupported student profile schema' })
      if (!existing) return res.status(200).json({ profile: null })
      if (teacherAuthorized) await assertTeacherStudentAccess(req, existing)
      if (!teacherAuthorized && !await verifyStudentCredential(existing, studentPassword)) return res.status(401).json({ error: 'Unauthorized' })
      return res.status(200).json({
        profile: sanitizeStudentProfileForResponse(addLegacyClassAttribution(withFreshTeacherSummary(existing)))
      })
    }

    if (req.method === 'PATCH') {
      const changes = req.body?.changes
        const allowedFields = ['ticketInbox', 'ticketRevealAll', 'displayAlias', 'name', 'preferredName', 'loginCode']
      if (!changes || typeof changes !== 'object' || Array.isArray(changes)
        || Object.keys(changes).some(field => !allowedFields.includes(field))
          || (changes.name !== undefined && (typeof changes.name !== 'string' || !changes.name.trim() || changes.name.length > 100))
          || (changes.displayAlias !== undefined && (typeof changes.displayAlias !== 'string' || !changes.displayAlias.trim() || changes.displayAlias.trim().length > 80))
          || (changes.preferredName !== undefined && (typeof changes.preferredName !== 'string' || changes.preferredName.trim().length > 80))
        || (changes.loginCode !== undefined && !/^\d{4}$/.test(String(changes.loginCode)))) {
        throw studentStoreError(400, 'Invalid teacher update')
      }
      await mutateStudentRecord(studentId, async current => {
        if (!current) throw studentStoreError(404, 'Student not found')
        await assertTeacherStudentAccess(req, current)
        if (Number(req.body.serverRevision) !== Number(current.serverRevision || 0)) throw studentStoreError(409, 'Profile changed; refresh before editing')
        if (changes.loginCode !== undefined && current.auth?.scheme === 'qr-pin-v1') {
          throw studentStoreError(400, 'QR/PIN credentials must be managed through the credential endpoint')
        }
        const next = {
          ...current,
            ...changes,
            ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
            ...(changes.displayAlias !== undefined ? { displayAlias: changes.displayAlias.trim() } : {}),
            ...(changes.preferredName !== undefined ? { preferredName: changes.preferredName.trim() } : {})
        }
        if (changes.loginCode !== undefined) {
          const salt = createSaltHex()
          next.auth = { ...current.auth, passwordScheme: STUDENT_PASSWORD_SCHEME, passwordSalt: salt,
            passwordHash: hashPasswordWithSalt(changes.loginCode, salt), passwordUpdatedAt: Date.now(),
            failedCodeAttempts: 0, lastFailedCodeAt: null }
          delete next.loginCode
        }
        if (changes.ticketRevealAll && Array.isArray(next.ticketResponses)) {
          next.ticketResponses = next.ticketResponses.map(item => ({ ...item, teacherRevealAt: next.ticketRevealAll[item.dispatchId] || null }))
        }
        return next
      })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'POST') {
      const profile = req.body?.profile
      if (!isCurrentStudentProfile(profile)) return res.status(400).json({ error: 'A complete current student profile is required' })
      if (existing?.auth?.scheme === 'qr-pin-v1') {
        if (!teacherAuthorized) return res.status(401).json({ error: 'Unauthorized' })
        await assertTeacherStudentAccess(req, existing)
        return res.status(405).json({ error: 'Pilot profiles use the session event API' })
      }
      const saved = await mutateStudentRecord(studentId, async current => {
        if (!current) throw studentStoreError(404, 'Student not found')
        if (!isCurrentStudentProfile(current)) throw studentStoreError(409, 'Unsupported student profile schema')
        if (teacherAuthorized) await assertTeacherStudentAccess(req, current)
        else if (!await verifyStudentCredential(current, studentPassword)) throw studentStoreError(401, 'Unauthorized')
        const incoming = normalizeProfileForStorage({ ...profile,
          auth: hasCurrentStudentPassword(profile.auth) ? profile.auth : { ...current.auth, ...profile.auth }
        }, studentId, studentPassword)
        const merged = mergeProfiles(current, incoming)
        for (const field of ['name', 'grade', 'classId', 'classIds', 'className', 'enrollmentKey', 'ticketInbox', 'ticketRevealAll']) merged[field] = current[field]
        if (Array.isArray(merged.ticketResponses)) merged.ticketResponses = merged.ticketResponses.map(item => ({
          ...item, teacherRevealAt: current.ticketRevealAll?.[item.dispatchId] || null
        }))
        const studentFields = new Set(['currentDifficulty', 'highestDifficulty', 'adaptive', 'activity', 'masteryFacts',
          'problemLog', 'recentProblems', 'stats', 'tableDrill', 'telemetry', 'ticketResponses', 'pongHighScore',
          'recentSelections', 'auth'])
        if (!teacherAuthorized) {
          for (const field of Object.keys(merged)) {
            if (!studentFields.has(field)) {
              if (Object.prototype.hasOwnProperty.call(current, field)) merged[field] = current[field]
              else delete merged[field]
            }
          }
        } else if (Number(profile.serverRevision) !== Number(current.serverRevision)) {
          for (const field of ['ticketInbox', 'ticketRevealAll']) merged[field] = current[field]
        }
        return normalizeProfileForStorage(withFreshTeacherSummary(merged), studentId, studentPassword)
      })
      return res.status(200).json({ ok: true, profile: sanitizeStudentProfileForResponse(saved) })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Storage backend unavailable' })
  }
}
