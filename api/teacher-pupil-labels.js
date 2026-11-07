import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { assertTeacherStudentAccess, canAccessClass } from './_studentAccess.js'
import { writePupilReferences } from './_pupilReferenceWrite.js'
import { isSuperAdminRole } from './_teacherRoles.js'
import { readAudienceProfiles } from './_audienceProfileBatch.js'
import { measureRequestStep } from './_requestTiming.js'

const MAX_LABELS = 500
const MAX_LABEL_LENGTH = 80
const studentLabelsKey = teacherId => `teacher_pupil_labels:${teacherId}`

async function batchLoadKvKeys(keys, batchSize = 20) {
  const results = []
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize)
    const groups = []
    for (let offset = 0; offset < batch.length; offset += 5) groups.push(batch.slice(offset, offset + 5))
    const batchResults = await Promise.all(groups.map(async group => {
      try {
        const values = await kv.mget(...group)
        if (!Array.isArray(values) || values.length !== group.length) throw Error('Incomplete label profile batch')
        return values
      } catch {
        // Large/legacy records or unavailable MGET must not drop valid names.
        return Promise.all(group.map(key => kv.get(key)))
      }
    }))
    results.push(...batchResults.flat())
  }
  return results
}

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

function scopeVersion(auth) {
  return JSON.stringify([auth.teacherId, auth.sessionVersion, auth.role, auth.isAdmin,
    [...new Set(auth.classIds || [])].sort(), [...new Set(auth.schoolIds || [])].sort()])
}

async function readLabelMemberships(keys) {
  const profiles = []
  for (let start = 0; start < keys.length; start += 40) {
    const parts = []
    for (let offset = 0; offset < 40 && start + offset < keys.length; offset += 10) {
      parts.push(keys.slice(start + offset, start + offset + 10))
    }
    const rows = await Promise.all(parts.map(part => readAudienceProfiles(part, undefined, { metadataOnly: true })))
    profiles.push(...rows.flat())
  }
  return profiles
}

// Read current membership from profiles, then current class authorization once
// for the collection. Do not read the teacher account again for every label.
async function readableLabels(req, teacherId) {
  const labels = normalizeLabels(await measureRequestStep(req, 'label-store', () => kv.get(studentLabelsKey(teacherId))))
  // Super admins already pass every per-pupil scope check. Revalidate the
  // live account after reading its private labels, without fetching hundreds
  // of unused pupil histories or re-reading that account once per label.
  const live = await getLiveTeacherAuthPayload(req)
  if (!live || live.teacherId !== teacherId) return {}
  if (isSuperAdminRole(live.role, live.isAdmin)) return labels
  const entries = Object.entries(labels)
  const studentKeys = entries.map(([studentId]) => `student:${studentId}`)
  const profiles = await measureRequestStep(req, 'label-memberships', () => readLabelMemberships(studentKeys))

  const classIds = [...new Set(profiles.flatMap(profile =>
    [profile?.classId, ...(profile?.classIds || [])].filter(Boolean).map(String)))]
  const classes = new Set()
  // Check the actual profile classes, including legacy classes missing from
  // a catalog index. Reuse only within this read, at most eight at a time.
  await measureRequestStep(req, 'label-class-scope', async () => {
    for (let start = 0; start < classIds.length; start += 8) {
      await Promise.all(classIds.slice(start, start + 8).map(async id => {
        if (await canAccessClass(req, id)) classes.add(id)
      }))
    }
  })
  const current = await getLiveTeacherAuthPayload(req)
  if (!current || current.teacherId !== teacherId) return {}
  if (isSuperAdminRole(current.role, current.isAdmin)) return labels
  // A role/school/session change during the read invalidates this result.
  if (scopeVersion(live) !== scopeVersion(current)) return {}
  const checked = entries.map(([studentId, label], index) => {
    const profile = profiles[index]
    return [profile?.classId, ...(profile?.classIds || [])].filter(Boolean).some(id => classes.has(String(id)))
      ? [studentId, label] : null
  })
  return Object.fromEntries(checked.filter(Boolean))
}

// The name a teacher typed when creating the pupil stays on the pupil record
// and is never sent to a dashboard. Copying it into this teacher's own labels
// keeps the name private to them while saving a manual pass over the class.
async function fillFromCreationNames(req, teacherId, requestedIds) {
  const labels = normalizeLabels(await kv.get(studentLabelsKey(teacherId)))
  let count = Object.keys(labels).length
  if (count >= MAX_LABELS) {
    return { added: 0, labels: await readableLabels(req, teacherId) }
  }
  const ids = requestedIds ?? await kv.smembers('students:index')
  // The index id is the record key; older profiles may lack a studentId field.
  const studentIds = [...new Set((Array.isArray(ids) ? ids : []).map(id => String(id || '').trim().toUpperCase()))]
    .filter(id => id && !labels[id])
  let added = 0
  for (let start = 0; start < studentIds.length && count < MAX_LABELS; start += 20) {
    const batch = studentIds.slice(start, start + 20)
    const profiles = await measureRequestStep(req, 'label-fill-profiles', () => batchLoadKvKeys(batch.map(id => `student:${id}`)))
    for (let i = 0; i < profiles.length && count < MAX_LABELS; i++) {
      const profile = profiles[i], studentId = batch[i]
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
      added++; count++
    }
  }
  if (added > 0) await writePupilReferences(studentLabelsKey(teacherId), labels, { labels: true })
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
    const studentIds = req.body?.studentIds
    if (studentIds !== undefined && (!Array.isArray(studentIds) || studentIds.length > 10000
      || studentIds.some(id => typeof id !== 'string' || !/^[A-Z0-9ÅÄÖ_-]{3,100}$/iu.test(id)))) {
      return res.status(400).json({ error: 'Invalid pupil selection' })
    }
    const filled = await fillFromCreationNames(req, auth.teacherId, studentIds)
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
  await writePupilReferences(studentLabelsKey(auth.teacherId), labels, { labels: true })
  return res.status(200).json({ ok: true, labels: await readableLabels(req, auth.teacherId) })
}
