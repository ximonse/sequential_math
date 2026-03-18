import { kv } from '@vercel/kv'
import { createHash } from 'node:crypto'
import { withCors } from './_helpers.js'

const MAX_ENTRIES = 7

function normalizeGroupKey(value) {
  if (!value || typeof value !== 'string') return null
  return value.trim().toLowerCase().replace(/\s+/g, '-')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

async function getHighscoreGroup(classId) {
  if (!classId) return null
  const extras = await kv.get(`class_extras:${classId}`)
  const raw = extras?.highscoreGroup
  return normalizeGroupKey(raw) || classId
}

function verifyStudentPassword(auth, password) {
  const provided = String(password || '')
  if (!provided) return false
  const { passwordHash, passwordSalt } = auth || {}
  if (!passwordHash || !passwordSalt) return false
  const actual = createHash('sha256').update(`${passwordSalt}:${provided}`).digest('hex')
  if (actual === passwordHash) return true
  const upper = provided.toUpperCase()
  if (upper !== provided) {
    const upperActual = createHash('sha256').update(`${passwordSalt}:${upper}`).digest('hex')
    if (upperActual === passwordHash) return true
  }
  return false
}

export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,POST,OPTIONS',
    headers: 'Content-Type, x-student-password'
  }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const game = String(req.query?.game || '').trim()
    const classId = String(req.query?.classId || '').trim()
    if (!game || !classId) return res.status(400).json({ error: 'game and classId required' })
    if (game !== 'pong' && game !== 'snake') return res.status(400).json({ error: 'game must be pong or snake' })

    const group = await getHighscoreGroup(classId)
    if (!group) return res.status(200).json({ highscores: [] })

    const key = `highscores:${game}:${group}`
    const list = await kv.get(key)
    return res.status(200).json({ highscores: Array.isArray(list) ? list : [], group })
  }

  if (req.method === 'POST') {
    const { game, studentId, name, score, classId } = req.body || {}
    if (!game || !studentId || score == null || !classId) {
      return res.status(400).json({ error: 'game, studentId, score, classId required' })
    }
    if (game !== 'pong' && game !== 'snake') return res.status(400).json({ error: 'game must be pong or snake' })

    // Verify student auth
    const studentPassword = String(req.headers['x-student-password'] || '')
    const profile = await kv.get(`student:${String(studentId).toUpperCase()}`)
    if (!profile?.auth || !verifyStudentPassword(profile.auth, studentPassword)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const group = await getHighscoreGroup(classId)
    if (!group) return res.status(400).json({ error: 'Could not resolve highscore group' })

    const key = `highscores:${game}:${group}`
    const current = (await kv.get(key)) || []
    const list = Array.isArray(current) ? current : []

    const numericScore = Number(score)
    const entry = {
      studentId: String(studentId).toUpperCase(),
      name: String(name || studentId).slice(0, 30),
      score: numericScore,
      timestamp: Date.now()
    }

    // If student already has a better or equal score, skip
    const existingBest = list.find(e => e.studentId === entry.studentId)
    if (existingBest && existingBest.score >= numericScore) {
      return res.status(200).json({ qualified: false, rank: null, highscores: list })
    }

    // Remove student's old entry (if any), add new, sort, trim
    const filtered = list.filter(e => e.studentId !== entry.studentId)
    filtered.push(entry)
    filtered.sort((a, b) => b.score - a.score)
    const trimmed = filtered.slice(0, MAX_ENTRIES)

    // Check if student made the cut
    if (!trimmed.some(e => e.studentId === entry.studentId)) {
      return res.status(200).json({ qualified: false, rank: null, highscores: list })
    }

    await kv.set(key, trimmed)
    const rank = trimmed.findIndex(e => e.studentId === entry.studentId) + 1
    return res.status(200).json({ qualified: true, rank, highscores: trimmed })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
