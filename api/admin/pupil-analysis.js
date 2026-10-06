import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload, withCors } from '../_helpers.js'
import { isSuperAdminRole } from '../_teacherRoles.js'
import { retirePupil } from '../_pupilLifecycle.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,DELETE,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Teacher authorization required' })
  if (!isSuperAdminRole(auth.role, auth.isAdmin)) return res.status(403).json({ error: 'Endast huvudadmin kan hantera statistikarkivet.' })
  try {
    if (req.method === 'POST') {
      const id = String(req.body?.studentId || '').trim().toUpperCase()
      const pending = await kv.get(`pupil_lifecycle:${id}`)
      if (!pending) return res.status(404).json({ error: 'Ingen påbörjad elevåtgärd finns.' })
      return res.status(200).json(await retirePupil(id, pending.mode, async () => {}))
    }
    const archiveId = String(req.query?.archiveId || '')
    if (archiveId && !/^[a-f0-9]{32}$/.test(archiveId)) return res.status(400).json({ error: 'Ogiltig statistikpost.' })
    if (req.method === 'DELETE' && archiveId) {
      await kv.del(`pupil_analysis:${archiveId}`)
      await kv.srem('pupil_analysis:index', archiveId)
      return res.status(200).json({ ok: true })
    }
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    if (archiveId) {
      const archive = await kv.get(`pupil_analysis:${archiveId}`)
      return res.status(archive ? 200 : 404).json(archive ? { archive } : { error: 'Statistikposten finns inte.' })
    }
    const ids = await kv.smembers('pupil_analysis:index') || []
    const archives = (await Promise.all(ids.map(id => kv.get(`pupil_analysis:${id}`)))).filter(Boolean)
      .map(archive => ({ archiveId: archive.archiveId, trainingAnswers: archive.training.attempts.length,
        diagnosticPoints: archive.diagnostics.points.length, grade: archive.training.grade }))
    const pendingIds = await kv.smembers('pupil_lifecycle_pending') || []
    const pending = (await Promise.all(pendingIds.map(async studentId => {
      const job = await kv.get(`pupil_lifecycle:${studentId}`)
      return job ? { studentId, mode: job.mode } : null
    }))).filter(Boolean)
    return res.status(200).json({ archives, pending })
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Elevåtgärden kunde inte slutföras. Återuppta städningen i administrationen.' })
  }
}
