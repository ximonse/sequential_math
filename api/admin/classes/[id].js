/**
 * GET    /api/admin/classes/:id — get class
 * PUT    /api/admin/classes/:id — update (name, teacherIds, enabledExtras)
 * DELETE /api/admin/classes/:id — delete class
 * Admin auth required.
 */
import { kv } from '@vercel/kv'
import {
  isAdminAuthorized,
  withCors
} from '../../_helpers.js'

export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,PUT,DELETE,OPTIONS',
    headers: 'Content-Type, x-teacher-token, x-teacher-password'
  })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: 'Admin access required' })
  }

  const id = String(req.query.id || '').trim()
  if (!id) return res.status(400).json({ error: 'Missing id' })

  const key = `class:${id}`

  try {
    const classRecord = await kv.get(key)
    if (!classRecord) return res.status(404).json({ error: 'Class not found' })

    if (req.method === 'GET') {
      return res.status(200).json({ class: classRecord })
    }

    if (req.method === 'PUT') {
      const updated = { ...classRecord }

      if (typeof req.body?.name === 'string' && req.body.name.trim()) {
        updated.name = req.body.name.trim()
      }
      if (Array.isArray(req.body?.teacherIds)) {
        const oldTeacherIds = Array.isArray(classRecord.teacherIds) ? classRecord.teacherIds : []
        const newTeacherIds = req.body.teacherIds.map(String).filter(Boolean)
        updated.teacherIds = newTeacherIds

        // Sync classIds on teacher accounts
        const removed = oldTeacherIds.filter(t => !newTeacherIds.includes(t))
        const added = newTeacherIds.filter(t => !oldTeacherIds.includes(t))

        await Promise.all([
          ...removed.map(async teacherId => {
            const acc = await kv.get(`teacher_account:${teacherId}`)
            if (!acc) return
            const classIds = (acc.classIds || []).filter(cid => cid !== id)
            await kv.set(`teacher_account:${teacherId}`, { ...acc, classIds })
          }),
          ...added.map(async teacherId => {
            const acc = await kv.get(`teacher_account:${teacherId}`)
            if (!acc) return
            const classIds = Array.from(new Set([...(acc.classIds || []), id]))
            await kv.set(`teacher_account:${teacherId}`, { ...acc, classIds })
          })
        ])
      }
      if (Array.isArray(req.body?.enabledExtras)) {
        updated.enabledExtras = req.body.enabledExtras.map(String).filter(Boolean)
      }

      updated.updatedAt = Date.now()
      await kv.set(key, updated)
      return res.status(200).json({ ok: true, class: updated })
    }

    if (req.method === 'DELETE') {
      await kv.del(key)
      await kv.srem('classes:index', id)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: 'Storage error', details: err?.message })
  }
}
