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

// The name a teacher typed when creating the pupil stays on the pupil record
// and is never sent to a dashboard. Copying it into this teacher's own labels
// keeps the name private to them while saving a manual pass over the class.
async function fillFromCreationNames(req, teacherId) {
  const labels = normalizeLabels(await kv.get(studentLabelsKey(teacherId)))
  const ids = await kv.smembers('students:index')
  let added = 0
  for (const rawId of Array.isArray(ids) ? ids : []) {
    const studentId = String(rawId || '').trim().toUpperCase()
    if (labels[studentId]) continue
    if (Object.keys(labels).length + 1 > MAX_LABELS) break
    const profile = await kv.get(`student:${studentId}`)
    if (!profile) continue
    const creationName = String(profile.preferredName || profile.name || '').trim()
    if (!creationName || creationName.length > MAX_LABEL_LENGTH) continue
    if (creationName === String(profile.displayAlias || '').trim()) continue
    try {
      await assertTeacherStudentAccess(req, profile)
    } catch {
      continue
    }
    labels[studentId] = creationName
    added += 1
  }
  if (added > 0) await kv.set(studentLabelsKey(teacherId), labels)
  return { added, labels: await readableLabels(req, teacherId) }
}

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,PUT,POST,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Teacher authorization required' })

  if (req.method === 'GET') {
    return res.status(200).json({ labels: await readableLabels(req, auth.teacherId) })
  }
  if (req.method === 'POST') {
    if (String(req.body?.action || '') !== 'fill_from_creation_names') {
      return res.status(400).json({ error: 'Unknown label action' })
    }
    const filled = await fillFromCreationNames(req, auth.teacherId)
    return res.status(200).json({ ok: true, ...filled })
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
