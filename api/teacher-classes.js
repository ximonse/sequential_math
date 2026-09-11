/**
 * GET    /api/teacher-classes        — list classes this teacher can see
 * POST   /api/teacher-classes        — create a class
 * DELETE /api/teacher-classes?id=xx  — delete a class
 */
import { kv } from '@vercel/kv'
import { randomBytes } from 'node:crypto'
import { createClassLoginToken } from './_studentSession.js'
import { createClassRecord, deleteClassRecord, mutateClassRecord } from './_classStore.js'
import { validateSchoolId } from './_schoolStore.js'
import { getLiveAuthorizedClassIds, canAccessClass } from './_studentAccess.js'
import {
  getLiveTeacherAuthPayload,
  isLiveTeacherApiAuthorized,
  withCors
} from './_helpers.js'

import { hasSchoolScope, isSuperAdminRole } from './_teacherRoles.js'
export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    headers: 'Content-Type, x-teacher-token'
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
      const classes = await Promise.all(ids.map(async id => { const current = await kv.get(`class:${id}`); if (!current || current.loginToken) return current; return mutateClassRecord(id, record => ({ ...record, loginToken: createClassLoginToken() })) }))
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
    const schoolId = await validateSchoolId(req.body?.schoolId)
    const enabledExtras = Array.isArray(req.body?.enabledExtras)
      ? req.body.enabledExtras.map(String)
      : []

    const payload = await getLiveTeacherAuthPayload(req)
    const teacherId = payload?.teacherId || null
    if (!schoolId) return res.status(400).json({ error: 'Välj en skola för klassen.' })
    if (!hasSchoolScope(payload, schoolId)) return res.status(403).json({ error: 'Klassen måste ligga på en skola som är tilldelad dig.' })
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
      schoolId,
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
  if (req.method === 'PUT') {
    const id = String(req.body?.id || '').trim()
    const name = String(req.body?.name || '').trim()
    if (!id || !name) return res.status(400).json({ error: 'id and name required' })
    if (!await canAccessClass(req, id)) return res.status(403).json({ error: 'Not authorized for this class' })
    if (req.body?.schoolId !== undefined) {
      let schoolId
      try { schoolId = await validateSchoolId(req.body.schoolId) }
      catch (error) { return res.status(error.status || 400).json({ error: error.message || 'Ogiltig skola.' }) }
      const auth = await getLiveTeacherAuthPayload(req)
      if (!schoolId || !hasSchoolScope(auth, schoolId)) return res.status(403).json({ error: 'Klassen måste ligga på en skola som är tilldelad dig.' })
    }
    try {
      const updated = await mutateClassRecord(id, current => {
        if (!current) throw Object.assign(new Error('Class not found'), { status: 404 })
        return { ...current, name, ...(req.body?.schoolId !== undefined ? { schoolId: req.body.schoolId } : {}) }
      })
      return res.status(200).json({ ok: true, class: updated })
    } catch (error) { return res.status(error.status || 500).json({ error: error.message || 'Storage error' }) }
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const id = String(req.query?.id || req.body?.id || '').trim()
    if (!id) return res.status(400).json({ error: 'id required' })

    const auth = await getLiveTeacherAuthPayload(req)
    const deletionKey = `class_deletion:${id}`
    const priorDeletion = await kv.get(deletionKey)
    const canResumeDeletion = Boolean(
      isSuperAdminRole(auth?.role) || (auth?.teacherId && Array.isArray(priorDeletion?.teacherIds)
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
