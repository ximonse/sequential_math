/**
 * GET    /api/teacher-classes        — list classes this teacher can see
 * POST   /api/teacher-classes        — create a class
 * DELETE /api/teacher-classes?id=xx  — delete a class
 */
import { kv } from '@vercel/kv'
import { randomBytes } from 'node:crypto'
import {
  getAuthorizedClassIds,
  getTeacherAuthPayload,
  isTeacherApiAuthorized,
  withCors
} from './_helpers.js'

export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,POST,DELETE,OPTIONS',
    headers: 'Content-Type, x-teacher-token, x-teacher-password'
  })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!isTeacherApiAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const authorizedClassIds = getAuthorizedClassIds(req) // null = admin sees all

  // ── GET ────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const ids = await kv.smembers('classes:index')
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(200).json({ classes: [] })
      }
      const classes = await Promise.all(ids.map(id => kv.get(`class:${id}`)))
      const filtered = classes
        .filter(Boolean)
        .filter(c => authorizedClassIds === null || authorizedClassIds.includes(c.id))
      return res.status(200).json({ classes: filtered })
    } catch (err) {
      return res.status(500).json({ error: 'Storage error', details: err?.message })
    }
  }

  // ── POST ───────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const name = String(req.body?.name || '').trim()
    if (!name) return res.status(400).json({ error: 'name required' })

    const id = String(req.body?.id || '').trim() || randomBytes(6).toString('hex')
    const enabledExtras = Array.isArray(req.body?.enabledExtras)
      ? req.body.enabledExtras.map(String)
      : []

    const payload = getTeacherAuthPayload(req)
    const teacherId = payload?.teacherId || null
    const teacherIds = teacherId ? [teacherId] : []

    const classRecord = {
      id,
      name,
      teacherIds,
      enabledExtras,
      createdAt: req.body?.createdAt || Date.now()
    }

    await kv.set(`class:${id}`, classRecord)
    await kv.sadd('classes:index', id)

    // Link to teacher account if applicable
    if (teacherId) {
      const acc = await kv.get(`teacher_account:${teacherId}`)
      if (acc) {
        const updatedClassIds = Array.from(new Set([...(acc.classIds || []), id]))
        await kv.set(`teacher_account:${teacherId}`, { ...acc, classIds: updatedClassIds })
      }
    }

    return res.status(201).json({ ok: true, class: classRecord })
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const id = String(req.query?.id || req.body?.id || '').trim()
    if (!id) return res.status(400).json({ error: 'id required' })

    // Check authorization
    if (authorizedClassIds !== null && !authorizedClassIds.includes(id)) {
      return res.status(403).json({ error: 'Not authorized for this class' })
    }

    await kv.del(`class:${id}`)
    await kv.srem('classes:index', id)

    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
