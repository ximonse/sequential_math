/**
 * GET /api/me/assignments
 * The signed-in pupil's active assignments from every class and group they
 * belong to, newest first. Group membership is private, hence the session.
 */
import { kv } from '@vercel/kv'
import { getLiveStudentSession } from '../_studentSession.js'
import { withCors } from '../_helpers.js'
import { listGroupRecords } from '../_groupStore.js'
import { readActiveAssignments } from '../../src/lib/activeAssignments.js'

export async function listPupilActiveAssignments(profile, { store = kv } = {}) {
  const studentId = String(profile?.studentId || '').toUpperCase()
  const classIds = [...new Set([profile?.classId, ...(profile?.classIds || [])].filter(Boolean).map(String))]
  const classes = await Promise.all(classIds.map(async id => (
    await store.exists(`class_deleted:${id}`) ? null : store.get(`class:${id}`))))
  const groups = (await listGroupRecords({ store })).filter(group => (group.pupilIds || []).includes(studentId))
  const sources = [
    ...classes.filter(record => record && !record.archived).map(record => ({ record, source: { type: 'class', id: record.id, name: record.name || '' } })),
    ...groups.map(record => ({ record, source: { type: 'group', id: record.id, name: record.name || '' } }))
  ]
  const byId = new Map()
  for (const { record, source } of sources) {
    for (const item of readActiveAssignments(record)) {
      const known = byId.get(item.assignment.id)
      if (!known || item.activatedAt > known.activatedAt) byId.set(item.assignment.id, { payload: item.payload, activatedAt: item.activatedAt, source })
    }
  }
  return [...byId.values()].sort((a, b) => b.activatedAt - a.activatedAt)
}

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,OPTIONS', headers: 'Content-Type' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const live = await getLiveStudentSession(req)
    if (!live) return res.status(401).json({ error: 'Inloggningen kunde inte bekräftas.' })
    return res.status(200).json({ assignments: await listPupilActiveAssignments(live.profile) })
  } catch {
    return res.status(503).json({ error: 'Uppdragen kunde inte hämtas.' })
  }
}
