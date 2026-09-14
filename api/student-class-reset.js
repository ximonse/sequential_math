import { kv } from '@vercel/kv'
import { createStudentProfile } from '../src/lib/studentProfile.js'
import { createPilotStudentAuth, createQrSecret, normalizeStudentLoginCode, reserveStudentLoginCode, studentLoginCodeIndexKey } from './_studentSession.js'
import { generateDisplayAlias, generateStudentPin } from './_studentAlias.js'
import { mutateStudentRecord, studentStoreError } from './_studentStore.js'
import { canAccessClass } from './_studentAccess.js'
import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'

function firstName(value) {
  return String(value || '').normalize('NFC').trim().split(/\s+/)[0] || ''
}

export default async function handler(req, res) {
  withCors(res, { methods: 'POST,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Cache-Control', 'no-store')

  try {
    const teacher = await getLiveTeacherAuthPayload(req)
    if (!teacher?.isPrimaryAdmin) throw studentStoreError(403, 'Endast huvudadministratör kan återställa en hel klass.')
    const classId = String(req.body?.classId || '').trim()
    if (!classId || !await canAccessClass(req, classId)) throw studentStoreError(403, 'Ingen behörighet till klassen.')

    // `students:index` is the source of truth. Older classes may not have a
    // complete class_students set, and leaving one legacy account behind would
    // defeat a reset.
    const credentials = []
    for (const rawId of await kv.smembers('students:index') || []) {
      const studentId = String(rawId || '').trim().toUpperCase()
      if (!studentId) continue
      const previous = await kv.get(`student:${studentId}`)
      if (!previous) continue
      const previousClassIds = [previous.classId, ...(previous.classIds || [])].map(String).filter(Boolean)
      if (!previousClassIds.includes(classId)) continue

      const qrSecret = createQrSecret()
      const pin = generateStudentPin()
      const existingAlias = String(previous.displayAlias || '').trim()
      const displayAlias = await reserveStudentLoginCode(studentId, () => generateDisplayAlias())
      const name = firstName(previous.name)
      const cleanProfile = createStudentProfile(studentId, name || displayAlias, Number(previous.grade) || 4)
      const saved = await mutateStudentRecord(studentId, async current => {
        if (!current) throw studentStoreError(404, 'Eleven finns inte längre.')
        return {
          ...cleanProfile,
          ...(name ? { name, displayAlias } : { displayAlias }),
          classId: String(current.classId || classId),
          classIds: [...new Set([current.classId, ...(current.classIds || [])].map(String).filter(Boolean))],
          className: String(current.className || ''),
          auth: {
            ...createPilotStudentAuth({ qrSecret, pin }),
            credentialVersion: Number(current.auth?.credentialVersion || 0) + 1
          }
        }
      })
      if (existingAlias && normalizeStudentLoginCode(existingAlias) !== normalizeStudentLoginCode(displayAlias)) {
        await kv.del(studentLoginCodeIndexKey(existingAlias))
      }
      credentials.push({ studentId, name: String(saved.name || '').trim(), displayAlias, qrSecret, pin })
    }

    return res.status(200).json({ ok: true, classId, credentials })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Kunde inte återställa elevkontona.' })
  }
}
