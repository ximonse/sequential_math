import { getLiveTeacherAuthPayload, setTeacherSessionCookie, withCors } from './_helpers.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,DELETE,OPTIONS', headers: 'Content-Type' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'DELETE') {
    const teacher = await getLiveTeacherAuthPayload(req)
    if (!teacher) return res.status(401).json({ error: 'Unauthorized' })
    setTeacherSessionCookie(res, '')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'GET') {
    const teacher = await getLiveTeacherAuthPayload(req)
    if (!teacher) return res.status(401).json({ error: 'Unauthorized' })
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ ok: true, teacherId: teacher.teacherId,
      classIds: teacher.classIds, isAdmin: teacher.isAdmin })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
