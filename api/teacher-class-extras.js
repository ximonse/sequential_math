/**
 * PUT /api/teacher-class-extras
 * Saves enabledExtras for a class to KV so students can read it.
 * Requires teacher auth token.
 */
import { kv } from '@vercel/kv'
import { getTeacherAuthPayload } from './_helpers.js'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = getTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })

  const classId = String(req.body?.classId || '').trim()
  const extras = Array.isArray(req.body?.enabledExtras)
    ? req.body.enabledExtras.map(String).filter(Boolean)
    : []

  if (!classId) return res.status(400).json({ error: 'classId required' })

  try {
    await kv.set(`class_extras:${classId}`, { enabledExtras: extras })
    // Also update the class record so GET /api/teacher-classes returns fresh extras
    const classRecord = await kv.get(`class:${classId}`)
    if (classRecord) {
      await kv.set(`class:${classId}`, { ...classRecord, enabledExtras: extras })
    }
    return res.status(200).json({ ok: true })
  } catch {
    return res.status(500).json({ error: 'Failed to save' })
  }
}
