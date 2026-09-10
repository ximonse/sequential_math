import { validateSchoolId } from './_schoolStore.js'
import { kv } from '@vercel/kv'
import { createHash, randomBytes } from 'node:crypto'
import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { canAccessClass, assertTeacherStudentAccess } from './_studentAccess.js'
import { createClassRecord } from './_classStore.js'
import { createStudentRecord, mutateStudentRecord, studentStoreError } from './_studentStore.js'

const digest = text => createHash('sha256').update(text).digest('hex')

export default async function handler(req, res) {
  withCors(res, { methods: 'POST,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const teacher = await getLiveTeacherAuthPayload(req)
  if (!teacher) return res.status(401).json({ error: 'Teacher authorization required' })
  try {
    const { requestId, classId, className, grade = 4, names = [], existingStudentIds = [] } = req.body || {}
    if (!Number.isInteger(grade) || grade < 1 || grade > 9) throw studentStoreError(400, 'Ogiltig årskurs.')
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{12,100}$/.test(requestId)) throw studentStoreError(400, 'Invalid request ID')
    if (!Array.isArray(names) || !Array.isArray(existingStudentIds) || names.length + existingStudentIds.length < 1
      || names.length + existingStudentIds.length > 100 || names.some(name => typeof name !== 'string' || !name.trim() || name.length > 100)) {
      throw studentStoreError(400, 'Ange 1–100 elever med giltiga namn.')
    }
    const schoolId = classId ? '' : await validateSchoolId(req.body?.schoolId)
    const owner = teacher.teacherId || 'admin'
    const enrollmentKey = digest(JSON.stringify([owner, requestId, classId || className, names, grade, existingStudentIds, ...(schoolId ? [schoolId] : [])]))
    let target
    if (classId) {
      if (!await canAccessClass(req, classId)) throw studentStoreError(403, 'Not authorized for this class')
      target = await kv.get(`class:${classId}`)
    } else {
      const name = String(className || '').trim()
      if (!name) throw studentStoreError(400, 'Ange klassnamn.')
      const id = `class_${digest(owner + requestId).slice(0, 20)}`
      target = await kv.get(`class:${id}`)
      if (target && target.enrollmentKey !== enrollmentKey) throw studentStoreError(409, 'Klasslistan har ändrats under ett pågående försök.')
      if (!target) {
        try { target = await createClassRecord({ id, name, schoolId, teacherIds: teacher.teacherId ? [teacher.teacherId] : [], enabledExtras: [], createdAt: Date.now(), enrollmentKey }) }
        catch (error) {
          if (error.status !== 409) throw error
          target = await kv.get(`class:${id}`)
          if (target?.enrollmentKey !== enrollmentKey) throw error
        }
      }
      if (!await canAccessClass(req, target.id)) throw studentStoreError(403, 'Not authorized for this class')
    }
    const results = []
    for (let index = 0; index < names.length; index++) {
      const name = names[index].trim()
      const suffix = digest(`${enrollmentKey}:${index}`).slice(0, 10).toUpperCase()
      const base = name.normalize('NFC').replace(/[^a-zA-Z0-9ÅÄÖåäö]+/g, '_').replace(/^_|_$/g, '').slice(0, 24).toUpperCase() || 'ELEV'
      const studentId = `${base}_${suffix}`
      try {
        let current = await kv.get(`student:${studentId}`)
        if (current && current.enrollmentKey !== enrollmentKey) throw studentStoreError(409, 'Student ID conflict')
        if (!current) {
          const now = Date.now(), salt = randomBytes(16).toString('hex')
          const record = { profileSchemaVersion: 1, studentId, name, grade, created_at: now,
            currentDifficulty: 1, highestDifficulty: 1, adaptive: { skillStates: {}, recentSelections: [] },
            masteryFacts: { version: 1, facts: [], revokedIds: [] }, recentProblems: [], problemLog: [],
            stats: { totalProblems: 0, correctAnswers: 0, overallSuccessRate: 0, avgTimePerProblem: 0, typeStats: {}, weakestTypes: [], strongestTypes: [] },
            classId: target.id, classIds: [target.id], className: target.name, enrollmentKey,
            auth: { passwordScheme: 'sha256-v1', passwordSalt: salt, passwordHash: digest(`${salt}:${name}`), passwordUpdatedAt: now, loginCount: 0, lastLoginAt: null } }
          try { current = await createStudentRecord(studentId, record) }
          catch (error) {
            if (error.status !== 409) throw error
            current = await kv.get(`student:${studentId}`)
            if (current?.enrollmentKey !== enrollmentKey) throw error
          }
        }
        results.push({ studentId, name, ok: true })
      } catch (error) { results.push({ studentId, name, ok: false, error: error.status ? error.message : 'Kunde inte spara eleven.' }) }
    }
    for (const rawId of existingStudentIds) {
      const studentId = String(rawId).trim().toUpperCase()
      try {
        const saved = await mutateStudentRecord(studentId, async current => {
          if (!current) throw studentStoreError(404, 'Eleven finns inte.')
          await assertTeacherStudentAccess(req, current)
          return { ...current, classIds: [...new Set([current.classId, ...(current.classIds || []), target.id].filter(Boolean))],
            classId: current.classId || target.id, className: current.className || target.name }
        })
        results.push({ studentId, name: saved.name, ok: true })
      } catch (error) { results.push({ studentId, ok: false, error: error.status ? error.message : 'Kunde inte lägga till eleven.' }) }
    }
    return res.status(200).json({ ok: results.every(item => item.ok), class: target, results })
  } catch (error) { return res.status(error.status || 500).json({ error: error.status ? error.message : 'Kunde inte spara klasslistan.' }) }
}
