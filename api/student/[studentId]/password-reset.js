import { randomBytes } from 'node:crypto'
import { hashPasswordWithSalt } from '../../_studentPassword.js'
import { mutateStudentRecord, studentStoreError } from '../../_studentStore.js'
import { assertTeacherStudentAccess } from '../../_studentAccess.js'
import { STUDENT_PASSWORD_SCHEME } from '../../../src/lib/studentProfileContract.js'
import { withCors } from '../../_helpers.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'POST,OPTIONS', headers: 'Content-Type, x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const studentId = String(req.query?.studentId || '').trim().toUpperCase()
    if (!studentId) throw studentStoreError(400, 'Student ID required')

    await mutateStudentRecord(studentId, async profile => {
      if (!profile) throw studentStoreError(404, 'Student not found')
      await assertTeacherStudentAccess(req, profile)
      if (profile.auth?.scheme === 'qr-pin-v1') {
        throw studentStoreError(400, 'QR+PIN pupils use a new pupil card instead')
      }
      const passwordSalt = randomBytes(16).toString('hex')
      const password = studentId
      const auth = {
        ...(profile.auth || {}),
        passwordScheme: STUDENT_PASSWORD_SCHEME,
        passwordSalt,
        passwordHash: hashPasswordWithSalt(password, passwordSalt),
        passwordUpdatedAt: Date.now()
      }
      delete auth.password
      return { ...profile, auth }
    })

    return res.status(200).json({ ok: true, password: studentId })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not reset password' })
  }
}
