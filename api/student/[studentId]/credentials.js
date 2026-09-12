import { createPilotStudentAuth, createQrSecret } from '../../_studentSession.js'
import { generateStudentPin } from '../../_studentAlias.js'
import { mutateStudentRecord, studentStoreError } from '../../_studentStore.js'
import { assertTeacherStudentAccess } from '../../_studentAccess.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const studentId = String(req.query?.studentId || '').trim().toUpperCase()
    let issued = null
    const current = await mutateStudentRecord(studentId, async profile => {
      if (!profile) throw studentStoreError(404, 'Student not found')
      await assertTeacherStudentAccess(req, profile)
      if (profile.auth?.scheme !== 'qr-pin-v1') throw studentStoreError(400, 'Student does not use pilot credentials')
      const qrSecret = createQrSecret(), pin = generateStudentPin()
      issued = { studentId, displayAlias: profile.displayAlias || '', qrSecret, pin }
      return { ...profile, auth: { ...createPilotStudentAuth({ qrSecret, pin }), credentialVersion: Number(profile.auth.credentialVersion || 1) + 1 } }
    })
    return res.status(200).json({ ok: true, credential: issued, serverRevision: current.serverRevision })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Kunde inte utfärda nytt elevkort.' })
  }
}
