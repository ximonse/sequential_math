import { kv } from '@vercel/kv'
import { withCors } from './_helpers.js'
import { verifyPasswordAgainstAuth } from './_studentPassword.js'
import { isCurrentStudentProfile } from '../src/lib/studentProfileContract.js'
import { normalizeStudentId } from '../src/lib/storageStudentId.js'

const normalizeName = value => String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv')
const denied = res => res.status(401).json({ error: 'Namn, elev-ID eller lösenord stämmer inte.' })

async function liveProfile(studentId) {
  if (await kv.exists(`student_deleted:${studentId}`)) return null
  const profile = await kv.get(`student:${studentId}`)
  return isCurrentStudentProfile(profile) && profile.studentId === studentId ? profile : null
}

export default async function handler(req, res) {
  withCors(res, { methods: 'POST,OPTIONS', headers: 'Content-Type' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { name, password } = req.body || {}
    if (typeof name !== 'string' || !name.trim() || name.length > 100
      || typeof password !== 'string' || !password.trim() || password.length > 500) {
      return res.status(400).json({ error: 'Ange namn eller elev-ID och lösenord.' })
    }
    if (req.body.schoolId !== undefined || req.body.classId !== undefined) {
      return res.status(400).json({ error: 'Skola och klass tilldelas av läraren. Ladda om sidan och logga in igen.' })
    }

    // Explicit IDs take precedence over display names, including legacy IDs.
    const id = normalizeStudentId(name)
    const exact = id ? await liveProfile(id) : null
    if (exact) {
      if (!verifyPasswordAgainstAuth(exact.auth, password)) return denied(res)
      return res.status(200).json({ studentId: exact.studentId })
    }

    const ids = [...new Set(await kv.smembers('students:index') || [])]
    const candidates = []
    const batchSize = 25
    for (let index = 0; index < ids.length; index += batchSize) {
      const batch = await Promise.all(ids.slice(index, index + batchSize).map(async id => {
        const profile = await liveProfile(String(id).toUpperCase())
        return profile && normalizeName(profile.name) === normalizeName(name) ? profile : null
      }))
      candidates.push(...batch.filter(Boolean))
    }
    const valid = candidates.filter(profile => verifyPasswordAgainstAuth(profile.auth, password))
    if (!valid.length) return denied(res)
    // Never guess between pupils, even when their passwords differ.
    if (candidates.length > 1) return res.status(409).json({
      error: 'Namnet finns på flera elevkonton. Skriv ditt elev-ID i samma ruta i stället. Be läraren om ditt ID.'
    })
    // School and group assignments are read from the authenticated profile.
    // Login never accepts or changes membership and returns no public directory.
    return res.status(200).json({ studentId: valid[0].studentId })
  } catch {
    return res.status(503).json({ error: 'Kunde inte nå inloggningen. Försök igen om en stund.' })
  }
}
