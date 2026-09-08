/**
 * PUT /api/teacher-class-extras
 * Saves enabledExtras for a class to KV so students can read it.
 * Requires teacher auth token.
 */
import { getTeacherAuthPayload, withCors } from './_helpers.js'
import { canAccessClass } from './_studentAccess.js'
import { mutateClassRecord } from './_classStore.js'
import { studentStoreError } from './_studentStore.js'

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

  if (!await canAccessClass(req, classId)) {
    return res.status(403).json({ error: 'Not authorized for this class' })
  }

  try {
    await mutateClassRecord(classId, current => {
      if (!current) throw studentStoreError(404, 'Class not found')
      const updated = { ...current, enabledExtras: extras }
      if (highscoreGroup !== undefined) updated.highscoreGroup = highscoreGroup || null
      return updated
    })
    return res.status(200).json({ ok: true })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to save' })
  }
}
