import { summarizeBreakGames } from '../src/lib/breakGameResults.js'
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
import { teacherAudience, teacherGroupChoices } from './_teacherAudience.js'
import { scopedStudentIds, teacherCatalog } from './_teacherCatalog.js'

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
    if (req.query?.resource === 'break-games') {
      const classId = String(req.query.classId || '')
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(classId)) return res.status(400).json({ error: 'Exact classId required' })
      const allowed = await getLiveAuthorizedClassIds(req)
      if (allowed !== null && !allowed.includes(classId)) return res.status(403).json({ error: 'Forbidden' })
      const to = req.query.to === undefined ? Date.now() + 1 : Number(req.query.to)
      const from = req.query.from === undefined ? to - 7 * 86400000 : Number(req.query.from)
      if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || from >= to || to - from > 30 * 86400000) {
        return res.status(400).json({ error: 'Use a finite period of at most 30 days' })
      }
      const ids = await scopedStudentIds(req, { classIds: [classId] })
      const profiles = (await batchLoadKvKeys(ids.map(id => `student:${id}`))).filter(isCurrentStudentProfile)
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ version: 1, classId, capturedAt: Date.now(),
        ...summarizeBreakGames(profiles, { from, to, classId }) })
    }
    if (req.query?.resource === 'classes') return await teacherClassChoices(req, res)
    if (req.query?.resource === 'groups') return await teacherGroupChoices(req, res)
    if (req.query?.resource === 'audience') return await teacherAudience(req, res)
    if (req.query?.resource === 'catalog') return await teacherCatalog(req, res)
    // Only the classes and pupils asked for (comma separated); without these the
    // full list is returned as before, for export and older callers.
    const listParam = value => {
      const ids = String(value || '').split(',').map(item => item.trim()).filter(Boolean)
      if (ids.length > 200) throw Object.assign(Error('För stort elevurval. Hämta högst 200 id åt gången.'), { status: 400 })
      return ids
    }
    const scoped = req.query?.classIds !== undefined || req.query?.studentIds !== undefined
    const ids = scoped
      ? await scopedStudentIds(req, { classIds: listParam(req.query.classIds), studentIds: listParam(req.query.studentIds) })
      : await kv.smembers('students:index')
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
    return res.status(error.status || 500).json({
      error: 'Storage backend unavailable',
      details: error?.message || 'unknown'
    })
  }
}
