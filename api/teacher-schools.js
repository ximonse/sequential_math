import { randomBytes } from 'node:crypto'
import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { mutateStoredRecord, studentStoreError } from './_studentStore.js'
import { listSchools } from './_schoolStore.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  const teacher = await getLiveTeacherAuthPayload(req)
  if (!teacher) return res.status(401).json({ error: 'Logga in som lärare.' })
  try {
    if (req.method === 'GET') return res.status(200).json({ schools: await listSchools() })
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const name = req.body?.name
    if (typeof name !== 'string' || !name.trim() || name.length > 100) {
      return res.status(400).json({ error: 'Ange skolans namn (högst 100 tecken).' })
    }
    const id = randomBytes(12).toString('hex')
    const school = await mutateStoredRecord('school', id, current => {
      if (current) throw studentStoreError(409, 'Skolan finns redan.')
      return { id, name: name.trim(), createdAt: Date.now(), createdBy: teacher.teacherId }
    })
    return res.status(201).json({ school: { id: school.id, name: school.name } })
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Kunde inte spara eller hämta skolor. Försök igen.' })
  }
}
