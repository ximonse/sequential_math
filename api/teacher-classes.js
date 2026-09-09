/**
 * GET    /api/teacher-classes        — list classes this teacher can see
 * POST   /api/teacher-classes        — create a class
 * DELETE /api/teacher-classes?id=xx  — delete a class
 */
import { kv } from '@vercel/kv'
import { randomBytes } from 'node:crypto'
import { createClassRecord, deleteClassRecord } from './_classStore.js'
import { getLiveAuthorizedClassIds, canAccessClass } from './_studentAccess.js'
import {
  getLiveTeacherAuthPayload,
  isLiveTeacherApiAuthorized,
  withCors
} from './_helpers.js'

export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,POST,DELETE,OPTIONS',
    headers: 'Content-Type, x-teacher-token, x-teacher-password'
  }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!await isLiveTeacherApiAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const authorizedClassIds = await getLiveAuthorizedClassIds(req)

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

    const payload = await getLiveTeacherAuthPayload(req)
    const teacherId = payload?.teacherId || null
    const teacherIds = teacherId ? [teacherId] : []

    // Prevent overwriting an existing class
    const existing = await kv.get(`class:${id}`)
    if (existing) {
      return res.status(409).json({ error: 'Class ID already exists' })
    }

    const classRecord = {
      id,
      name,
      teacherIds,
      enabledExtras,
      createdAt: req.body?.createdAt || Date.now()
    }

    try {
      await createClassRecord(classRecord)
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.status ? error.message : 'Storage error' })
    }

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

    const auth = await getLiveTeacherAuthPayload(req)
    const deletionKey = `class_deletion:${id}`
    const priorDeletion = await kv.get(deletionKey)
    const canResumeDeletion = Boolean(
      auth?.isAdmin || (auth?.teacherId && Array.isArray(priorDeletion?.teacherIds)
        && priorDeletion.teacherIds.includes(auth.teacherId))
    )
    const hasLiveAccess = authorizedClassIds === null || await canAccessClass(req, id)
    if (!hasLiveAccess && !canResumeDeletion) {
      return res.status(403).json({ error: 'Not authorized for this class' })
    }

    try {
      // Keep a narrow retry capability before tombstoning removes live access.
      if (hasLiveAccess && !priorDeletion) {
        const record = await kv.get(`class:${id}`)
        if (record) {
          await kv.set(deletionKey, {
            teacherIds: Array.isArray(record.teacherIds) ? record.teacherIds : [],
            startedAt: Date.now()
          })
        }
      }
      await deleteClassRecord(id)
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.status ? error.message : 'Storage error' })
    }

    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
