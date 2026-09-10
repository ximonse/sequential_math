import { listSchools } from './_schoolStore.js'
import { kv } from '@vercel/kv'
import { withCors } from './_helpers.js'
import { verifyPasswordAgainstAuth } from './_studentPassword.js'
import { isCurrentStudentProfile } from '../src/lib/studentProfileContract.js'

const normalizeName = value => String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv')
const denied = res => res.status(401).json({ error: 'Skola, klass, namn eller lösenord stämmer inte.' })

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,OPTIONS', headers: 'Content-Type' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (req.method === 'GET') {
      const schools = new Map((await listSchools()).map(school => [school.id, school.name]))
      const ids = await kv.smembers('classes:index')
      const classes = await Promise.all((ids || []).map(async id => {
        if (await kv.exists(`class_deleted:${id}`)) return null
        const record = await kv.get(`class:${id}`)
        if (!record?.id || !record?.name || (record.schoolId && !schools.has(record.schoolId))) return null
        return { id: record.id, name: record.name, schoolId: record.schoolId || '', schoolName: schools.get(record.schoolId) || 'Skola ej angiven' }
      }))
      // The public chooser contains class names only, never a pupil directory.
      return res.status(200).json({ classes: classes.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'sv')) })
    }

    const { classId, name, password, schoolId = '' } = req.body || {}
    if (typeof classId !== 'string' || !classId || classId.length > 200
      || typeof name !== 'string' || !name.trim() || name.length > 100
      || typeof password !== 'string' || !password.trim() || password.length > 500) {
      return res.status(400).json({ error: 'Välj klass och ange namn och lösenord.' })
    }
    const classRecord = await kv.get(`class:${classId}`)
    if (await kv.exists(`class_deleted:${classId}`) || !classRecord
      || (classRecord.schoolId || '') !== schoolId) return denied(res)
    if (schoolId && (!await kv.get(`school:${schoolId}`) || await kv.exists(`school_deleted:${schoolId}`))) return denied(res)

    const ids = await kv.smembers('students:index')
    const candidates = []
    // Bound concurrent full-profile reads; class membership lives on the profile.
    const batchSize = 25
    for (let index = 0; index < (ids || []).length; index += batchSize) {
      const batch = await Promise.all(ids.slice(index, index + batchSize).map(async id => {
        const studentId = String(id).toUpperCase()
        const profile = await kv.get(`student:${studentId}`)
        if (!isCurrentStudentProfile(profile) || profile.studentId !== studentId
          || normalizeName(profile.name) !== normalizeName(name)) return null
        const classIds = [profile.classId, ...(Array.isArray(profile.classIds) ? profile.classIds : [])]
        if (!classIds.includes(classId) || await kv.exists(`student_deleted:${studentId}`)) return null
        return profile
      }))
      candidates.push(...batch.filter(Boolean))
    }
    const valid = candidates.filter(profile => verifyPasswordAgainstAuth(profile.auth, password))
    if (!valid.length) return denied(res)
    // Even different passwords must not silently select between identical names.
    if (candidates.length > 1) return res.status(409).json({
      error: 'Flera elever i klassen har samma namn. Välj ”Logga in med elev-ID” och be läraren om ditt elev-ID.'
    })
    // Authentication and profile loading continue through the existing ID route.
    // No credentials, roster or training data are returned by this lookup.
    return res.status(200).json({ studentId: valid[0].studentId })
  } catch {
    return res.status(503).json({ error: 'Kunde inte nå inloggningen. Försök igen om en stund.' })
  }
}
