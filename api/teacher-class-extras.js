/**
 * PUT /api/teacher-class-extras
 * Saves enabledExtras for a class to KV so students can read it.
 * Requires teacher auth token.
 */
import { kv } from '@vercel/kv'
import { getAuthorizedClassIds, getTeacherAuthPayload, withCors } from './_helpers.js'

export default async function handler(req, res) {
  withCors(res, {
    methods: 'PUT,OPTIONS',
    headers: 'Content-Type, x-teacher-token, x-teacher-password'
  }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = getTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })

  const classId = String(req.body?.classId || '').trim()
  const extras = Array.isArray(req.body?.enabledExtras)
    ? req.body.enabledExtras.map(String).filter(Boolean)
    : []
  const highscoreGroup = req.body?.highscoreGroup !== undefined
    ? String(req.body.highscoreGroup || '').trim()
    : undefined

  if (!classId) return res.status(400).json({ error: 'classId required' })

  const authorizedClassIds = getAuthorizedClassIds(req)
  if (authorizedClassIds !== null && !authorizedClassIds.includes(classId)) {
    return res.status(403).json({ error: 'Not authorized for this class' })
  }

  try {
    // Read-merge-write to preserve other fields (e.g. highscoreGroup when saving extras)
    const existing = (await kv.get(`class_extras:${classId}`)) || {}
    const merged = { ...existing, enabledExtras: extras }
    if (highscoreGroup !== undefined) {
      merged.highscoreGroup = highscoreGroup || null
    }
    await kv.set(`class_extras:${classId}`, merged)

    // Also update the class record so GET /api/teacher-classes returns fresh data
    const classRecord = await kv.get(`class:${classId}`)
    if (classRecord) {
      const classUpdate = { ...classRecord, enabledExtras: extras }
      if (highscoreGroup !== undefined) classUpdate.highscoreGroup = highscoreGroup || null
      await kv.set(`class:${classId}`, classUpdate)
    }
    return res.status(200).json({ ok: true })
  } catch {
    return res.status(500).json({ error: 'Failed to save' })
  }
}
