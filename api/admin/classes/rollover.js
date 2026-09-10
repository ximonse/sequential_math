import { kv } from '@vercel/kv'
import { mutateClassRecord, normalizeClassName } from '../../_classStore.js'
import { validateSchoolId } from '../../_schoolStore.js'
import { isLiveAdminAuthorized, withCors } from '../../_helpers.js'

function nextYearName(name) {
  const match = String(name || '').trim().match(/^([4-8])(\s*[A-Za-zÅÄÖåäö].*)$/)
  return match ? `${Number(match[1]) + 1}${match[2]}` : null
}

export default async function handler(req, res) {
  withCors(res, { methods: 'POST,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!await isLiveAdminAuthorized(req)) return res.status(401).json({ error: 'Admin access required' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const schoolId = await validateSchoolId(req.body?.schoolId)
    if (!schoolId) return res.status(400).json({ error: 'Välj skola för årsbytet.' })
    const ids = await kv.smembers('classes:index') || []
    const classes = (await Promise.all(ids.map(id => kv.get(`class:${id}`)))).filter(record => record?.schoolId === schoolId)
    const changes = classes.map(record => ({ id: record.id, from: record.name, to: nextYearName(record.name) })).filter(change => change.to)
    if (changes.length === 0) return res.status(200).json({ changes: [], message: 'Inga klasser med årskurs 4–8 kunde höjas.' })

    const nextNames = new Map(classes.map(record => [record.id, normalizeClassName(record.name)]))
    for (const change of changes) nextNames.set(change.id, normalizeClassName(change.to))
    const duplicates = [...nextNames.values()].filter((name, index, values) => values.indexOf(name) !== index)
    if (duplicates.length) return res.status(409).json({ error: 'Årsbytet skulle skapa två klasser med samma namn. Byt namn eller flytta undan den berörda klassen först.', changes })

    if (req.body?.dryRun !== false) return res.status(200).json({ changes, dryRun: true })
    for (const change of changes) {
      await mutateClassRecord(change.id, current => ({ ...current, name: change.to, updatedAt: Date.now() }), { skipClassNameCheck: true })
    }
    return res.status(200).json({ ok: true, changes })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Kunde inte genomföra årsbytet.' })
  }
}