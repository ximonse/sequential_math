import { kv } from '@vercel/kv'
import { withCors } from './_helpers.js'
import { isCurrentStudentProfile } from '../src/lib/studentProfileContract.js'
import { verifyPasswordAgainstAuth } from './_studentPassword.js'
import { issueStudentSession } from './_studentSession.js'

const normalizeName = value => String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv')
const classIdsFor = profile => new Set([profile?.classId, ...(Array.isArray(profile?.classIds) ? profile.classIds : [])].map(value => String(value || '').trim()).filter(Boolean))

async function getClassByToken(token) {
  if (!token) return null
  const ids = await kv.smembers('classes:index') || []
  const records = await Promise.all(ids.map(async id => {
    if (await kv.exists(`class_deleted:${id}`)) return null
    const record = await kv.get(`class:${id}`)
    return record?.loginToken === token ? record : null
  }))
  return records.find(Boolean) || null
}

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,OPTIONS', headers: 'Content-Type' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  try {
    const token = String(req.method === 'GET' ? req.query?.class : req.body?.classToken || '').trim()
    const classRecord = await getClassByToken(token)
    if (!classRecord) return res.status(404).json({ error: 'Klasslänken är inte giltig längre. Be läraren om en ny.' })
    if (req.method === 'GET') return res.status(200).json({ className: classRecord.name })
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const name = String(req.body?.name || '').trim()
    const code = String(req.body?.code || '').trim()
    if (!name || name.length > 100 || !/^\d{4}$/.test(code)) return res.status(400).json({ error: 'Skriv ditt namn och din fyrsiffriga kod.' })
    const ids = await kv.smembers('students:index') || []
    const profiles = await Promise.all(ids.map(async id => {
      const studentId = String(id).toUpperCase()
      if (await kv.exists(`student_deleted:${studentId}`)) return null
      const profile = await kv.get(`student:${studentId}`)
      return isCurrentStudentProfile(profile) && profile.studentId === studentId ? profile : null
    }))
    const matches = profiles.filter(profile => profile && classIdsFor(profile).has(classRecord.id) && normalizeName(profile.name) === normalizeName(name))
    if (matches.length !== 1 || !verifyPasswordAgainstAuth(matches[0].auth, code)) return res.status(401).json({ error: 'Namnet eller koden stämmer inte. Be läraren om hjälp.' })
    const sessionSecret = await issueStudentSession(matches[0].studentId, req.body?.remember === true)
    return res.status(200).json({ studentId: matches[0].studentId, sessionSecret, classId: classRecord.id, className: classRecord.name })
  } catch {
    return res.status(503).json({ error: 'Kunde inte nå inloggningen. Försök igen om en stund.' })
  }
}