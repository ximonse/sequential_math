import { hashPasswordWithSalt, verifyStudentCredential } from '../_studentPassword.js'
import { kv } from '@vercel/kv'
import { mutateStudentRecord, studentStoreError } from '../_studentStore.js'
import { assertTeacherStudentAccess } from '../_studentAccess.js'
import {
  isLiveTeacherApiAuthorized,
  withCors
} from '../_helpers.js'
import { withFreshTeacherSummary } from '../../src/lib/teacherSummary.js'
import { removeStudentHighscores } from '../highscores.js'
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

export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,POST,PATCH,DELETE,OPTIONS',
    headers: 'Content-Type, x-student-password, x-teacher-token'
  }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const studentId = String(req.query.studentId || '').trim().toUpperCase()
  if (!studentId) return res.status(400).json({ error: 'Missing studentId' })

  try {
    const key = `student:${studentId}`
    const teacherAuthorized = await isLiveTeacherApiAuthorized(req)
    const studentPassword = String(req.headers['x-student-password'] || '')
    const stored = await kv.get(key)
    const existing = isCurrentStudentProfile(stored) ? stored : null

    if (req.method === 'DELETE') {
      let deletedClassIds = []
      await mutateStudentRecord(studentId, async current => {
        await assertTeacherStudentAccess(req, current)
        deletedClassIds = [current?.classId, ...(current?.classIds || [])].filter(Boolean)
        return null
      })
      let highscoreCleanup = 'complete'
      try {
        await removeStudentHighscores(studentId, deletedClassIds)
      } catch {
        // The pupil record is already tombstoned. Do not pretend the entire
        // deletion failed, but expose the pending external cleanup explicitly.
        highscoreCleanup = 'pending'
      }
      return res.status(200).json({ ok: true, deleted: true, highscoreCleanup })
    }

    if (req.method === 'GET') {
      if (await kv.exists(`student_deleted:${studentId}`)) return res.status(410).json({ error: 'Student deleted' })
      if (stored && !existing) {
        return res.status(409).json({ error: 'Unsupported student profile schema' })
      }
      const profile = existing
      if (!profile) return res.status(200).json({ profile: null })

      if (teacherAuthorized) await assertTeacherStudentAccess(req, profile)
      if (!teacherAuthorized && !await verifyStudentCredential(profile, studentPassword)) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const safeProfile = withFreshTeacherSummary(profile)
      if (safeProfile.auth) {
        const { passwordHash, passwordSalt, passwordScheme, password, ...safeAuth } = safeProfile.auth
        safeProfile.auth = safeAuth
      }
      return res.status(200).json({ profile: safeProfile })
    }

    if (req.method === 'PATCH') {
      const changes = req.body?.changes
      if (!changes || typeof changes !== 'object' || Array.isArray(changes)
        || Object.keys(changes).some(field => !['ticketInbox', 'ticketRevealAll', 'name', 'loginCode'].includes(field))
        || (changes.name !== undefined && (typeof changes.name !== 'string' || !changes.name.trim() || changes.name.length > 100))
        || (changes.loginCode !== undefined && !/^\\d{4}$/.test(String(changes.loginCode)))) {
        throw studentStoreError(400, 'Invalid teacher update')
      }
      await mutateStudentRecord(studentId, async current => {
        if (!current) throw studentStoreError(404, 'Student not found')
        await assertTeacherStudentAccess(req, current)
        if (Number(req.body.serverRevision) !== Number(current.serverRevision || 0)) {
          throw studentStoreError(409, 'Profile changed; refresh before editing')
        }
        const next = { ...current, ...changes, ...(changes.name !== undefined ? { name: changes.name.trim() } : {}) }
        if (changes.loginCode !== undefined) { const salt = createSaltHex(); next.auth = { ...current.auth, passwordScheme: STUDENT_PASSWORD_SCHEME, passwordSalt: salt, passwordHash: hashPasswordWithSalt(changes.loginCode, salt), passwordUpdatedAt: Date.now(), failedCodeAttempts: 0, lastFailedCodeAt: null }; delete next.loginCode }
        if (changes.ticketRevealAll && Array.isArray(next.ticketResponses)) {
          next.ticketResponses = next.ticketResponses.map(item => ({ ...item,
            teacherRevealAt: next.ticketRevealAll[item.dispatchId] || null }))
        }
        return next
      })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'POST') {
      const profile = req.body?.profile
      if (!isCurrentStudentProfile(profile)) {
        return res.status(400).json({ error: 'A complete current student profile is required' })
      }

      const saved = await mutateStudentRecord(studentId, async current => {
        // Only enrollment creates pupils; stale training snapshots cannot.
        if (!current) throw studentStoreError(404, 'Student not found')
        if (!isCurrentStudentProfile(current)) throw studentStoreError(409, 'Unsupported student profile schema')
        if (teacherAuthorized) await assertTeacherStudentAccess(req, current)
        else if (!await verifyStudentCredential(current, studentPassword)) throw studentStoreError(401, 'Unauthorized')
        const incoming = normalizeProfileForStorage({
          ...profile,
          auth: hasCurrentStudentPassword(profile.auth) ? profile.auth : { ...current.auth, ...profile.auth }
        }, studentId, studentPassword)
        const merged = mergeProfiles(current, incoming)
        for (const field of ['name', 'grade', 'classId', 'classIds', 'className', 'enrollmentKey', 'ticketInbox', 'ticketRevealAll']) merged[field] = current[field]
        if (Array.isArray(merged.ticketResponses)) {
          merged.ticketResponses = merged.ticketResponses.map(item => ({ ...item,
            teacherRevealAt: current.ticketRevealAll?.[item.dispatchId] || null }))
        }
        const studentFields = new Set([
          'currentDifficulty', 'highestDifficulty', 'adaptive', 'activity',
          'masteryFacts', 'problemLog', 'recentProblems', 'stats', 'tableDrill',
          'telemetry', 'ticketResponses', 'pongHighScore', 'recentSelections', 'auth'
        ])
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
      return res.status(200).json({ ok: true, profile: saved })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Storage backend unavailable'
    })
  }
}