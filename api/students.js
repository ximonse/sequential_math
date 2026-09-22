import { kv } from '@vercel/kv'
import {
  isLiveTeacherApiAuthorized,
  withCors
} from './_helpers.js'
import { withFreshTeacherSummary } from '../src/lib/teacherSummary.js'
import { isCurrentStudentProfile } from '../src/lib/studentProfileContract.js'
import { toTeacherListProfile } from '../src/lib/teacherListProfile.js'
import { getLiveAuthorizedClassIds } from './_studentAccess.js'
import { getLiveTeacherAuthPayload } from './_helpers.js'
import { isSuperAdminRole } from './_teacherRoles.js'

export function sanitizeProfileForList(profile) {
  if (!profile || typeof profile !== 'object') return null

  const freshProfile = withFreshTeacherSummary(profile)
  return toTeacherListProfile({
    ...freshProfile,
    auth: freshProfile.auth && typeof freshProfile.auth === 'object'
      ? {
          // Credential family only. It lets the dashboard distinguish QR+PIN
          // accounts from legacy name/password accounts without exposing a
          // hash, PIN verifier, secret or credential version.
          scheme: freshProfile.auth.scheme || null,
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
    headers: 'Content-Type, x-teacher-token'
  }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!await isLiveTeacherApiAuthorized(req)) {
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
    const auth = await getLiveTeacherAuthPayload(req)
    const includeArchived = String(req.query?.includeArchived || '') === '1'
    if (includeArchived && !isSuperAdminRole(auth?.role, auth?.isAdmin)) {
      return res.status(403).json({ error: 'Endast huvudadmin kan visa arkiverade elever.' })
    }
    const classIds = await kv.smembers('classes:index') || []
    const activeClassIds = new Set((await Promise.all(classIds.map(async id => {
      const classRecord = await kv.get(`class:${id}`)
      if (!classRecord || classRecord.archived) return null
      if (authorizedClassIds !== null && !authorizedClassIds.includes(classRecord.id)) return null
      return String(classRecord.id)
    }))).filter(Boolean))

    const sanitized = profiles
      .filter(isCurrentStudentProfile)
      .filter(profile => {
        const classId = String(profile?.classId || '')
        const classIds = Array.isArray(profile?.classIds) ? profile.classIds : []
        const memberships = [classId, ...classIds].filter(Boolean)
        if (includeArchived) {
          return authorizedClassIds === null || authorizedClassIds.some(id => memberships.includes(id))
        }
        return memberships.some(id => activeClassIds.has(id))
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
