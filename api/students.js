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
import { teacherClassChoices } from './_teacherClassChoices.js'

async function batchLoadKvKeys(keys, batchSize = 20) {
  const results = []
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(key => kv.get(key)))
    results.push(...batchResults)
  }
  return results
}

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
    if (req.query?.resource === 'classes') return await teacherClassChoices(req, res)
    const ids = await kv.smembers('students:index')
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(200).json({ profiles: [] })
    }

    const studentKeys = ids.map(id => `student:${String(id).toUpperCase()}`)
    const profiles = await batchLoadKvKeys(studentKeys)

    const authorizedClassIds = await getLiveAuthorizedClassIds(req)
    const auth = await getLiveTeacherAuthPayload(req)
    const includeArchived = String(req.query?.includeArchived || '') === '1'
    if (includeArchived && !isSuperAdminRole(auth?.role, auth?.isAdmin)) {
      return res.status(403).json({ error: 'Endast huvudadmin kan visa arkiverade elever.' })
    }
    const classIds = await kv.smembers('classes:index') || []
    const classKeys = classIds.map(id => `class:${id}`)
    const classRecords = await batchLoadKvKeys(classKeys)
    const activeClassIds = new Set(classRecords
      .filter(classRecord => {
        if (!classRecord || classRecord.archived) return false
        if (authorizedClassIds !== null && !authorizedClassIds.includes(classRecord.id)) return false
        return true
      })
      .map(classRecord => String(classRecord.id)))

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
