import { createHash } from 'node:crypto'
import { secureCompare } from './_helpers.js'
import { hasCurrentStudentPassword } from '../src/lib/studentProfileContract.js'
import { verifyStudentSession } from './_studentSession.js'

export function hashPasswordWithSalt(password, salt) {
  return createHash('sha256').update(`${salt}:${String(password || '')}`).digest('hex')
}

export function verifyPasswordAgainstAuth(auth, studentPassword) {
  const provided = String(studentPassword || '')
  if (!provided || !hasCurrentStudentPassword(auth)) return false
  const expected = String(auth.passwordHash)
  const salt = String(auth.passwordSalt)
  if (secureCompare(hashPasswordWithSalt(provided, salt), expected)) return true
  const upper = provided.toUpperCase()
  return upper !== provided && secureCompare(hashPasswordWithSalt(upper, salt), expected)
}

export async function verifyStudentCredential(profile, credential) {
  if (!profile?.studentId) return false
  if (verifyPasswordAgainstAuth(profile.auth, credential)) return true
  return verifyStudentSession(profile.studentId, credential)
}
