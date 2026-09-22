import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { assertTeacherStudentAccess } from './_studentAccess.js'

const MAX_LABELS = 500
const MAX_LABEL_LENGTH = 80
const studentLabelsKey = teacherId => `teacher_pupil_labels:${teacherId}`

function normalizeLabels(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const labels = {}
  for (const [studentId, label] of Object.entries(value)) {
    const id = String(studentId || '').trim().toUpperCase()
    const normalizedLabel = typeof label === 'string' ? label.trim() : ''
    if (/^[A-Z0-9ÅÄÖ_-]{3,100}$/u.test(id) && normalizedLabel && normalizedLabel.length <= MAX_LABEL_LENGTH) {
      labels[id] = normalizedLabel
    }
  }
  return labels
}

async function readableLabels(req, teacherId) {
  const labels = normalizeLabels(await kv.get(studentLabelsKey(teacherId)))
  const readable = {}
  for (const [studentId, label] of Object.entries(labels)) {
    const profile = await kv.get(`student:${studentId}`)
    try {
      await assertTeacherStudentAccess(req, profile)
      readable[studentId] = label
    } catch {
      // A former teacher must not receive labels for pupils outside their live scope.
    }
  }
  return readable
}

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,PUT,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Teacher authorization required' })

  if (req.method === 'GET') {
    return res.status(200).json({ labels: await readableLabels(req, auth.teacherId) })
  }
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const studentId = String(req.body?.studentId || '').trim().toUpperCase()
  const label = typeof req.body?.label === 'string' ? req.body.label.trim() : null
  if (!/^[A-Z0-9ÅÄÖ_-]{3,100}$/u.test(studentId) || label === null || label.length > MAX_LABEL_LENGTH) {
    return res.status(400).json({ error: 'Invalid pupil label' })
  }
  if (await kv.get(`student:${studentId}`) === null) return res.status(404).json({ error: 'Student not found' })
  try {
    await assertTeacherStudentAccess(req, await kv.get(`student:${studentId}`))
  } catch (error) {
    return res.status(error.status || 403).json({ error: error.message || 'Not authorized for this student' })
  }

  const labels = normalizeLabels(await kv.get(studentLabelsKey(auth.teacherId)))
  if (label) labels[studentId] = label
  else delete labels[studentId]
  if (Object.keys(labels).length > MAX_LABELS) return res.status(400).json({ error: 'Too many pupil labels' })
  await kv.set(studentLabelsKey(auth.teacherId), labels)
  return res.status(200).json({ ok: true, labels: await readableLabels(req, auth.teacherId) })
}
