import { createPilotStudentAuth, createQrSecret, reserveStudentLoginCode } from '../../_studentSession.js'
import { generateDisplayAlias, generateStudentPin } from '../../_studentAlias.js'
import { kv } from '@vercel/kv'
import { mutateStudentRecord, studentStoreError } from '../../_studentStore.js'
import { assertTeacherStudentAccess } from '../../_studentAccess.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const studentId = String(req.query?.studentId || '').trim().toUpperCase()
    let issued = null
    const existing = await kv.get(`student:${studentId}`)
    const proposedAlias = existing?.displayAlias || generateDisplayAlias()
    const displayAlias = await reserveStudentLoginCode(studentId, () => proposedAlias)
    const current = await mutateStudentRecord(studentId, async profile => {
      if (!profile) throw studentStoreError(404, 'Student not found')
      await assertTeacherStudentAccess(req, profile)
      const qrSecret = createQrSecret(), pin = generateStudentPin()
      issued = { studentId, name: String(profile.name || '').trim(), displayAlias, qrSecret, pin }
      return { ...profile, displayAlias, auth: { ...createPilotStudentAuth({ qrSecret, pin }), credentialVersion: Number(profile.auth?.credentialVersion || 0) + 1 } }
    })
    return res.status(200).json({ ok: true, credential: issued, serverRevision: current.serverRevision })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Kunde inte utfärda nytt elevkort.' })
  }
}
