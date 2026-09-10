import { kv } from '@vercel/kv'
import { createHash } from 'node:crypto'
import { withCors } from './_helpers.js'
import {
  hasCurrentStudentPassword,
  isCurrentStudentProfile
} from '../src/lib/studentProfileContract.js'

const MAX_ENTRIES = 7

function normalizeGroupKey(value) {
  if (!value || typeof value !== 'string') return null
  return value.trim().toLowerCase().replace(/\s+/g, '-')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

async function getHighscoreGroup(classId) {
  if (!classId) return null
  const classRecord = await kv.get(`class:${classId}`)
  if (!classRecord) return null
  const extras = classRecord.highscoreGroup === undefined ? await kv.get(`class_extras:${classId}`) : null
  const raw = classRecord.highscoreGroup === undefined ? extras?.highscoreGroup : classRecord.highscoreGroup
  return normalizeGroupKey(raw) || classId
}

function getHighscoreIndexKey(studentId) {
  return `student_highscore_keys:${String(studentId || '').trim().toUpperCase()}`
}

/**
 * Remove a pupil from every indexed highscore list. The current class groups
 * are included as a fallback for scores created before the index existed.
 */
export async function removeStudentHighscores(studentId, classIds = [], store = kv) {
  const normalizedId = String(studentId || '').trim().toUpperCase()
  if (!normalizedId) return { removedEntries: 0, inspectedLists: 0 }

  const indexKey = getHighscoreIndexKey(normalizedId)
  const indexedKeys = await store.smembers(indexKey)
  const keys = new Set(Array.isArray(indexedKeys) ? indexedKeys : [])

  for (const classId of classIds) {
    const group = await getHighscoreGroup(classId)
    if (!group) continue
    keys.add(`highscores:pong:${group}`)
    keys.add(`highscores:snake:${group}`)
  }

  let removedEntries = 0
  for (const key of keys) {
    if (!/^highscores:(pong|snake):/.test(String(key))) continue
    const list = await store.get(key)
    if (!Array.isArray(list)) continue
    const filtered = list.filter(entry => String(entry?.studentId || '').toUpperCase() !== normalizedId)
    removedEntries += list.length - filtered.length
    if (filtered.length !== list.length) await store.set(key, filtered)
  }
  await store.del(indexKey)
  return { removedEntries, inspectedLists: keys.size }
}

function verifyStudentPassword(auth, password) {
  const provided = String(password || '')
  if (!hasCurrentStudentPassword(auth)) return false
  if (!provided) return false
  const { passwordHash, passwordSalt } = auth
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
    if (!isCurrentStudentProfile(profile) || !verifyStudentPassword(profile.auth, studentPassword)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const assignedClassIds = new Set([profile.classId, ...(Array.isArray(profile.classIds) ? profile.classIds : [])]
      .map(value => String(value || '').trim())
      .filter(Boolean))
    if (!assignedClassIds.has(String(classId).trim())) {
      return res.status(403).json({ error: 'Class is not assigned to this student' })
    }

    const group = await getHighscoreGroup(classId)
    if (!group) return res.status(400).json({ error: 'Could not resolve highscore group' })

    const key = `highscores:${game}:${group}`
    const current = (await kv.get(key)) || []
    const list = Array.isArray(current) ? current : []

    const numericScore = Number(score)
    const normalizedStudentId = String(studentId).toUpperCase()
    const entry = {
      studentId: normalizedStudentId,
      name: String(profile.name || studentId).slice(0, 30),
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
    await kv.sadd(getHighscoreIndexKey(normalizedStudentId), key)
    const rank = trimmed.findIndex(e => e.studentId === entry.studentId) + 1
    return res.status(200).json({ qualified: true, rank, highscores: trimmed })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
