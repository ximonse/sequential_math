import { randomBytes } from 'node:crypto'
import { kv } from '@vercel/kv'
import { normalizeStudentId } from '../src/lib/storageStudentId.js'

const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30
const TEMPORARY_TTL_SECONDS = 60 * 60 * 12
const keyFor = token => `student_session:${token}`

export function createClassLoginToken() {
  return randomBytes(24).toString('base64url')
}

export async function issueStudentSession(studentId, remember) {
  const normalizedId = normalizeStudentId(studentId)
  if (!normalizedId) return ''
  const token = `st_${randomBytes(32).toString('base64url')}`
  await kv.set(keyFor(token), normalizedId, { ex: remember ? REMEMBER_TTL_SECONDS : TEMPORARY_TTL_SECONDS })
  return token
}

export async function verifyStudentSession(studentId, token) {
  const normalizedId = normalizeStudentId(studentId)
  const value = await kv.get(keyFor(String(token || '')))
  return Boolean(normalizedId && value === normalizedId)
}