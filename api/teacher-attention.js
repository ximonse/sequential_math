import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { canViewAttentionResults } from '../src/lib/attentionAccess.js'
import { isCurrentStudentProfile } from '../src/lib/studentProfileContract.js'
import { archiveAttentionEvents, readAttentionArchive } from './_attentionArchive.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const teacher = await getLiveTeacherAuthPayload(req)
    if (!teacher) return res.status(401).json({ error: 'Teacher authorization required' })
    if (!canViewAttentionResults(teacher)) return res.status(403).json({ error: 'Endast huvudadmin får läsa fokusresultat.' })
    const id = String(req.query.studentId || '').trim().toUpperCase()
    if (!/^[A-Z0-9ÅÄÖ_]{3,100}$/u.test(id)) return res.status(400).json({ error: 'Invalid studentId' })
    const profile = await kv.get(`student:${id}`)
    if (!isCurrentStudentProfile(profile)) return res.status(404).json({ error: 'Student not found' })
    const after = String(req.query.after || '')
    const ids = req.query.ids ? String(req.query.ids).split(',') : null
    const asOf = req.query.asOf ? Number(req.query.asOf) : Date.now()
    if (!/^[A-Za-z0-9_-]{0,80}$/.test(after) || !Number.isFinite(asOf) || asOf <= 0 || asOf > Date.now()
      || (ids && (ids.length > 50 || ids.some(value => !/^[A-Za-z0-9_-]{1,80}$/.test(value))))) return res.status(400).json({ error: 'Invalid cursor' })
    // Preserve retained legacy data even if this pupil never starts another focus pass.
    if (!after && !ids) await archiveAttentionEvents(id, profile, [], { migrate: true })
    return res.status(200).json({ studentId: id, ...await readAttentionArchive(id, profile, { after, asOf, ids }) })
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Fokusarkivet kunde inte hämtas.' })
  }
}
