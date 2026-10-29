import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload } from './_helpers.js'
import { getLiveAuthorizedClassIds } from './_studentAccess.js'

// Unlike the legacy teacher-classes GET, this projection never initializes tokens.
export async function teacherClassChoices(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const query = String(req.query?.query || '').trim().toLocaleLowerCase('sv-SE')
  const limit = Number(req.query?.limit ?? 50), offset = Number(req.query?.offset ?? 0)
  if (query.length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 100
    || !Number.isInteger(offset) || offset < 0 || offset > 10000) return res.status(400).json({ error: 'Ogiltigt klassurval.' })
  const ids = await kv.smembers('classes:index') || []
  const initialAccess = await getLiveAuthorizedClassIds(req)
  const candidates = ids.filter(id => initialAccess === null || initialAccess.includes(id))
  const choices = []
  for (let start = 0; start < candidates.length; start += 20) {
    const rows = await Promise.all(candidates.slice(start, start + 20).map(async id => {
      const record = await kv.get(`class:${id}`)
      if (!record || record.id !== id || record.archived || await kv.exists(`class_deleted:${id}`)) return null
      return { classId: id, name: String(record.name || id) }
    }))
    choices.push(...rows.filter(Boolean))
  }
  if (!await getLiveTeacherAuthPayload(req)) return res.status(401).json({ error: 'Lärarsessionen har upphört.' })
  const liveAccess = await getLiveAuthorizedClassIds(req)
  const matches = choices.filter(c => (liveAccess === null || liveAccess.includes(c.classId))
    && [c.classId, c.name].some(text => text.toLocaleLowerCase('sv-SE').includes(query)))
    .sort((a, b) => a.classId.localeCompare(b.classId))
  return res.status(200).json({ classes: matches.slice(offset, offset + limit), total: matches.length,
    nextOffset: offset + limit < matches.length ? offset + limit : null })
}
