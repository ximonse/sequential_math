import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'

const ARRAY_FIELDS = new Set(['assignments', 'ticketTemplates', 'ticketDispatches'])
const ALLOWED_FIELDS = new Set([...ARRAY_FIELDS, 'activeAssignmentId'])
const MAX_ITEMS = 500
const MAX_BYTES = 500_000

function normalizePatch(body) {
  const patch = {}
  for (const [key, value] of Object.entries(body || {})) {
    if (!ALLOWED_FIELDS.has(key)) continue
    if (key === 'activeAssignmentId') patch[key] = String(value || '').trim()
    else {
      if (!Array.isArray(value) || value.length > MAX_ITEMS) {
        throw Object.assign(new Error('Ogiltig eller för stor lärardata.'), { status: 400 })
      }
      patch[key] = value
    }
  }
  if (Buffer.byteLength(JSON.stringify(patch), 'utf8') > MAX_BYTES) {
    throw Object.assign(new Error('Lärardatan är för stor.'), { status: 413 })
  }
  return patch
}

const fieldKey = (teacherId, field) => `teacher_workspace:${teacherId}:${field}`

async function readWorkspace(teacherId) {
  const values = await Promise.all([...ALLOWED_FIELDS].map(field => kv.get(fieldKey(teacherId, field))))
  const workspace = { teacherId }
  let found = false
  ;[...ALLOWED_FIELDS].forEach((field, index) => {
    if (values[index] !== null && values[index] !== undefined) {
      workspace[field] = values[index]
      found = true
    }
  })
  return found ? workspace : null
}

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,PUT,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Teacher authorization required' })

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ workspace: await readWorkspace(auth.teacherId) })
    }
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })
    const patch = normalizePatch(req.body)
    await Promise.all(Object.entries(patch).map(([field, value]) => kv.set(fieldKey(auth.teacherId, field), value)))
    const workspace = await readWorkspace(auth.teacherId)
    return res.status(200).json({ ok: true, workspace })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Kunde inte spara lärardata.' })
  }
}
