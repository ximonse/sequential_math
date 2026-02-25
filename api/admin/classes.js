/**
 * GET  /api/admin/classes  — list all classes
 * POST /api/admin/classes  — create a new class
 * Both require admin auth.
 */
import { kv } from '@vercel/kv'
import { randomBytes } from 'node:crypto'
import {
  isAdminAuthorized,
  withCors
} from '../_helpers.js'

export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,POST,OPTIONS',
    headers: 'Content-Type, x-teacher-token, x-teacher-password'
  })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: 'Admin access required' })
  }

  if (req.method === 'GET') {
    try {
      const ids = await kv.smembers('classes:index')
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(200).json({ classes: [] })
      }
      const classes = await Promise.all(ids.map(id => kv.get(`class:${id}`)))
      return res.status(200).json({ classes: classes.filter(Boolean) })
    } catch (err) {
      return res.status(500).json({ error: 'Storage error', details: err?.message })
    }
  }

  if (req.method === 'POST') {
    const name = String(req.body?.name || '').trim()
    if (!name) {
      return res.status(400).json({ error: 'name required', code: 'MISSING_NAME' })
    }

    const id = randomBytes(6).toString('hex')
    const teacherIds = Array.isArray(req.body?.teacherIds) ? req.body.teacherIds.map(String) : []
    const enabledExtras = Array.isArray(req.body?.enabledExtras) ? req.body.enabledExtras.map(String) : []

    const classRecord = {
      id,
      name,
      teacherIds,
      enabledExtras,
      createdAt: Date.now()
    }

    await kv.set(`class:${id}`, classRecord)
    await kv.sadd('classes:index', id)

    // Update each assigned teacher's classIds
    await Promise.all(teacherIds.map(async teacherId => {
      const acc = await kv.get(`teacher_account:${teacherId}`)
      if (!acc) return
      const updatedClassIds = Array.from(new Set([...(acc.classIds || []), id]))
      await kv.set(`teacher_account:${teacherId}`, { ...acc, classIds: updatedClassIds })
    }))

    return res.status(201).json({ ok: true, class: classRecord })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
