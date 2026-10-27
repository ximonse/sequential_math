import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload, withCors } from '../_helpers.js'
import { assertTeacherStudentAccess } from '../_studentAccess.js'
import { isCurrentStudentProfile } from '../../src/lib/studentProfileContract.js'
import { withFreshTeacherSummary } from '../../src/lib/teacherSummary.js'
import { attentionProfileForViewer } from '../../src/lib/attentionAccess.js'
import { readPupilEvidence } from '../_pupilEvidenceRead.js'
import { pupilAnalysisAction } from '../_pupilAnalysisApi.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET' && !(req.method === 'POST' && req.query?.resource === 'analysis')) return res.status(405).json({ error: 'Method not allowed' })
  const teacher = await getLiveTeacherAuthPayload(req)
  if (!teacher) return res.status(401).json({ error: 'Teacher authorization required' })
  res.setHeader('Cache-Control', 'no-store')

  const studentId = String(req.query?.studentId || '').trim().toUpperCase()
  if (!studentId) return res.status(400).json({ error: 'Missing studentId' })
  try {
    if (req.query?.resource === 'analysis') return res.status(200).json(await pupilAnalysisAction(req, teacher, studentId))
    if (req.query?.resource === 'evidence') return res.status(200).json(await readPupilEvidence(req, teacher, studentId))
    const profile = await kv.get(`student:${studentId}`)
    if (!isCurrentStudentProfile(profile)) return res.status(404).json({ error: 'Student not found' })
    await assertTeacherStudentAccess(req, profile)
    const safeProfile = withFreshTeacherSummary(profile)
    if (safeProfile.auth) {
      const { passwordHash, passwordSalt, passwordScheme, password, ...auth } = safeProfile.auth
      safeProfile.auth = auth
    }
    return res.status(200).json({ profile: attentionProfileForViewer(safeProfile, teacher) })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Storage backend unavailable',
      ...(error.code && error.status ? { code: error.code } : {}) })
  }
}
