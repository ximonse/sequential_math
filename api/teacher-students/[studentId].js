import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload, withCors } from '../_helpers.js'
import { assertTeacherStudentAccess } from '../_studentAccess.js'
import { isCurrentStudentProfile } from '../../src/lib/studentProfileContract.js'
import { withFreshTeacherSummary } from '../../src/lib/teacherSummary.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!await getLiveTeacherAuthPayload(req)) return res.status(401).json({ error: 'Teacher authorization required' })

  const studentId = String(req.query?.studentId || '').trim().toUpperCase()
  if (!studentId) return res.status(400).json({ error: 'Missing studentId' })
  try {
    const profile = await kv.get(`student:${studentId}`)
    if (!isCurrentStudentProfile(profile)) return res.status(404).json({ error: 'Student not found' })
    await assertTeacherStudentAccess(req, profile)
    const safeProfile = withFreshTeacherSummary(profile)
    if (safeProfile.auth) {
      const { passwordHash, passwordSalt, passwordScheme, password, ...auth } = safeProfile.auth
      safeProfile.auth = auth
    }
    return res.status(200).json({ profile: safeProfile })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Storage backend unavailable' })
  }
}
