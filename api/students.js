import { kv } from '@vercel/kv'
import {
  isTeacherApiAuthorized,
  withCors
} from './_helpers.js'
import { withFreshTeacherSummary } from '../src/lib/teacherSummary.js'
import { isCurrentStudentProfile } from '../src/lib/studentProfileContract.js'
import { toTeacherListProfile } from '../src/lib/teacherListProfile.js'
import { getLiveAuthorizedClassIds } from './_studentAccess.js'

export function sanitizeProfileForList(profile) {
  if (!profile || typeof profile !== 'object') return null

  const freshProfile = withFreshTeacherSummary(profile)
  return toTeacherListProfile({
    ...freshProfile,
    auth: freshProfile.auth && typeof freshProfile.auth === 'object'
      ? {
          lastLoginAt: freshProfile.auth.lastLoginAt || null,
          loginCount: freshProfile.auth.loginCount || 0,
          passwordUpdatedAt: freshProfile.auth.passwordUpdatedAt || null
        }
      : {}
  })
}

export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,OPTIONS',
    headers: 'Content-Type, x-teacher-token, x-teacher-password'
  }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!isTeacherApiAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const ids = await kv.smembers('students:index')
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(200).json({ profiles: [] })
    }

    const profiles = await Promise.all(
      ids.map(async (id) => kv.get(`student:${String(id).toUpperCase()}`))
    )

    const authorizedClassIds = await getLiveAuthorizedClassIds(req)

    const sanitized = profiles
      .filter(isCurrentStudentProfile)
      .filter(profile => {
        // null = admin, sees everything
        if (authorizedClassIds === null) return true
        const classId = String(profile?.classId || '')
        const classIds = Array.isArray(profile?.classIds) ? profile.classIds : []
        return authorizedClassIds.some(id => id === classId || classIds.includes(id))
      })
      .map(sanitizeProfileForList)
      .filter(Boolean)

    return res.status(200).json({ profiles: sanitized })
  } catch (error) {
    return res.status(500).json({
      error: 'Storage backend unavailable',
      details: error?.message || 'unknown'
    })
  }
}
