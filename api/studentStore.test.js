import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'

const memory = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(memory.get(key) ?? null)),
  exists: vi.fn(async key => memory.has(key) ? 1 : 0),
  smembers: vi.fn(async key => [...(memory.get(key) || [])]),
  sadd: vi.fn(async (key, ...values) => {
    const members = new Set(memory.get(key) || [])
    values.forEach(value => members.add(value))
    memory.set(key, [...members])
  }),
  srem: vi.fn(async (key, ...values) => {
    const members = new Set(memory.get(key) || [])
    values.forEach(value => members.delete(value))
    memory.set(key, [...members])
  }),
  set: vi.fn(async (key, value) => memory.set(key, structuredClone(value))),
  del: vi.fn(async key => memory.delete(key)),
  eval: vi.fn(async (_script, keys, args) => {
    // Atomic fake Redis boundary; conflict/retry behavior runs in real handlers.
    const [key, deletedKey, indexKey] = keys
    const [expected, operation, json, id] = args
    if (memory.has(deletedKey)) return -2
    const current = memory.get(key)
    const version = current ? Number(current.serverRevision) || 0 : -1
    if (version !== Number(expected)) return 0
    const index = new Set(memory.get(indexKey) || [])
    if (operation === 'delete') {
      memory.set(deletedKey, json)
      memory.delete(key)
      index.delete(id)
    } else {
      const next = JSON.parse(json)
      if (next.classIds?.some(classId => memory.has(`class_deleted:${classId}`))) return -3
      memory.set(key, next)
      index.add(id)
    }
    memory.set(indexKey, [...index])
    return 1
  })
} }))
vi.mock('./_helpers.js', () => ({
  getTeacherAuthPayload: req => req.teacher || null,
  getLiveTeacherAuthPayload: async req => req.teacher || null,
  isTeacherApiAuthorized: req => Boolean(req.teacher),
  isLiveTeacherApiAuthorized: async req => Boolean(req.teacher),
  isLiveAdminAuthorized: async req => Boolean(req.teacher?.isAdmin),
  secureCompare: (a, b) => a === b,
  withCors: () => {}
}))

import studentHandler from './student/[studentId].js'
import eventsHandler from './student/[studentId]/events.js'
import rosterHandler from './student-roster.js'
import classResetHandler from './student-class-reset.js'
import teacherClassesHandler from './teacher-classes.js'
import { isCurrentStudentProfile } from '../src/lib/studentProfileContract.js'
import { sanitizeProfileForList } from './students.js'
import { isTeacherListProfile } from '../src/lib/teacherListProfile.js'
import { createStudentRecord, mutateStudentRecord, studentDeletedKey } from './_studentStore.js'
import { createClassRecord, deleteClassRecord } from './_classStore.js'
import { createStudentProfile } from '../src/lib/studentProfile.js'
import { createPilotStudentAuth, createQrSecret } from './_studentSession.js'

const admin = { isAdmin: true }
const owner = { teacherId: 'owner', isAdmin: false, classIds: [] }
const primaryAdmin = { teacherId: 'primary', isAdmin: true, isPrimaryAdmin: true }
function profile() {
  return {
    ...createStudentProfile('PUPIL', 'Same name', 4),
    classId: 'A', classIds: ['A'], className: '4a',
    auth: { passwordScheme: 'sha256-v1', passwordSalt: 'salt',
      passwordHash: createHash('sha256').update('salt:pw').digest('hex'), passwordUpdatedAt: 1 }
  }
}
function result(id) {
  return { problemId: id, timestamp: Date.now(), correct: true,
    operation: 'addition', problemType: 'addition', difficulty: { conceptual_level: 1 },
    studentAnswer: 2, correctAnswer: 2, timeSpent: 2, speedTimeSec: 2 }
}
async function call(handler, method, body = {}, teacher = admin) {
  const req = { method, query: { studentId: 'PUPIL' },
    headers: { 'x-student-password': 'pw' }, body, teacher }
  const res = { code: 200, headers: {}, setHeader(name, value) { this.headers[name] = value }, status(code) { this.code = code; return this },
    json(data) { this.data = data; return this } }
  await handler(req, res)
  return res
}
async function callClass(method, id, teacher = owner, body = {}) {
  const req = { method, query: { id }, headers: {}, body, teacher }
  const res = { code: 200, status(code) { this.code = code; return this },
    json(data) { this.data = data; return this } }
  await teacherClassesHandler(req, res)
  return res
}
beforeEach(async () => {
  memory.clear()
  process.env.PILOT_ENROLLMENT_SECRET = 'test-only-pilot-enrollment-secret-32-bytes'
  await createClassRecord({ id: 'A', name: '4a', teacherIds: ['owner'] })
  await createStudentRecord('PUPIL', profile())
})

describe('student persistence boundary', () => {
  it('allows a teacher to update a pupil name while allowing class names to change', async () => {
    const pupil = await call(studentHandler, 'PATCH', { serverRevision: 0, changes: { name: 'New name' } }, owner)
    expect(pupil.code).toBe(200)
    expect(memory.get('student:PUPIL')).toMatchObject({ studentId: 'PUPIL', name: 'New name', classIds: ['A'] })
    const klass = await callClass('PUT', 'A', owner, { id: 'A', name: '4B' })
    expect(klass).toMatchObject({ code: 200, data: { ok: true } })
    expect(memory.get('class:A')).toMatchObject({ id: 'A', name: '4B' })
  })
  it('creates distinct same-name pupils and safely retries a concurrent roster submission', async () => {
    const body = { requestId: 'synthetic-request-1234', className: 'Test class', names: ['Karl', 'Karl', 'Lo A'] }
    const responses = await Promise.all([
      call(rosterHandler, 'POST', body, owner), call(rosterHandler, 'POST', body, owner)
    ])
    expect(responses.map(res => res.data.ok)).toEqual([true, true])
    const ids = responses[0].data.results.map(row => row.studentId)
    expect(new Set(ids).size).toBe(3)
    expect(responses[1].data.results.map(row => row.studentId)).toEqual(ids)
    expect(memory.get('students:index')).toHaveLength(4)
    for (const id of ids) expect(isCurrentStudentProfile(memory.get(`student:${id}`))).toBe(true)
    expect((await call(rosterHandler, 'POST', body, owner)).data.ok).toBe(true)
    expect(memory.get('students:index')).toHaveLength(4)
  })

  it('never reuses a same-name pupil when creating another class', async () => {
    const body = { requestId: 'synthetic-request-1234', className: 'First', names: ['Karl'] }
    const first = await call(rosterHandler, 'POST', body, owner)
    const second = await call(rosterHandler, 'POST', { ...body, requestId: 'synthetic-request-5678', className: 'Second' }, owner)
    expect(first.data.results[0].studentId).not.toBe(second.data.results[0].studentId)
  })

  it('creates idempotent pseudonymous pilot seats without storing names or raw credentials', async () => {
    const body = { requestId: 'pilot-request-2026-a', className: 'Pilotklass', grade: 6, pilotCount: 3 }
    const first = await call(rosterHandler, 'POST', body, owner)
    const replay = await call(rosterHandler, 'POST', body, owner)

    expect(first).toMatchObject({ code: 200, data: { ok: true } })
    expect(first.headers['Cache-Control']).toBe('no-store')
    expect(replay.data.results).toEqual(first.data.results)
    expect(first.data.results).toHaveLength(3)
    expect(new Set(first.data.results.map(row => row.displayAlias)).size).toBe(3)

    for (const row of first.data.results) {
      expect(row).toMatchObject({ ok: true })
      expect(row.studentId).toMatch(/^[A-F0-9]{32}$/)
      expect(row.qrSecret.length).toBeGreaterThan(40)
      expect(row.pin).toMatch(/^\d{4}$/)
      const stored = memory.get(`student:${row.studentId}`)
      expect(stored).toMatchObject({ studentId: row.studentId, displayAlias: row.displayAlias, grade: 6,
        classId: first.data.class.id, classIds: [first.data.class.id], auth: { scheme: 'qr-pin-v1' } })
      expect(Object.hasOwn(stored, 'name')).toBe(false)
      expect(JSON.stringify(stored)).not.toContain(row.qrSecret)
      expect(JSON.stringify(stored)).not.toContain(`\"${row.pin}\"`)
    }
    expect(new Set(memory.get(`class_students:${first.data.class.id}`))).toEqual(new Set(first.data.results.map(row => row.studentId)))
  })

  it('adds existing identity to a group only by explicit ID and live source ownership', async () => {
    const body = { requestId: 'synthetic-request-1234', className: 'Group', existingStudentIds: ['PUPIL'] }
    const added = await call(rosterHandler, 'POST', body, owner)
    expect(added.data.ok).toBe(true)
    expect(memory.get('student:PUPIL').classIds).toContain(added.data.class.id)
    const denied = await call(rosterHandler, 'POST', { ...body, requestId: 'synthetic-request-5678' }, { teacherId: 'stranger' })
    expect(denied.data.ok).toBe(false)
    expect(memory.get('student:PUPIL').classIds).not.toContain(denied.data.class.id)
  })

  it('rejects list summaries as writable profiles and omits credentials from the list', async () => {
    const dto = sanitizeProfileForList(memory.get('student:PUPIL'))
    expect(isTeacherListProfile(dto)).toBe(true)
    expect(dto.problemLog).toBeUndefined()
    expect(dto.auth.passwordHash).toBeUndefined()
    expect((await call(studentHandler, 'POST', { profile: dto })).code).toBe(400)
  })

  it('keeps the QR+PIN credential family in the teacher list without exposing credentials', () => {
    const pilot = { ...profile(), auth: createPilotStudentAuth({ qrSecret: createQrSecret(), pin: '1234' }) }
    const dto = sanitizeProfileForList(pilot)
    expect(dto.auth).toMatchObject({ scheme: 'qr-pin-v1' })
    expect(JSON.stringify(dto)).not.toMatch(/qrSecretHash|credentialVersion|"pin"/i)
  })

  it('resets a class to fresh QR+PIN accounts while retaining only first names and class membership', async () => {
    const req = { method: 'POST', headers: {}, body: { classId: 'A' }, teacher: primaryAdmin }
    const res = { code: 200, headers: {}, setHeader(name, value) { this.headers[name] = value }, status(code) { this.code = code; return this }, json(data) { this.data = data; return this } }
    await classResetHandler(req, res)
    expect(res).toMatchObject({ code: 200, data: { ok: true, classId: 'A' }, headers: { 'Cache-Control': 'no-store' } })
    expect(res.data.credentials).toHaveLength(1)
    expect(res.data.credentials[0]).toMatchObject({ studentId: 'PUPIL', name: 'Same', pin: expect.stringMatching(/^\d{4}$/) })
    const stored = memory.get('student:PUPIL')
    expect(stored).toMatchObject({ name: 'Same', classId: 'A', classIds: ['A'], auth: { scheme: 'qr-pin-v1' }, problemLog: [], recentProblems: [] })
    expect(stored.auth.passwordHash).toBeUndefined()
    expect(stored.ticketInbox).toBeUndefined()
  })

  it('does not let a teacher or ordinary admin reset an entire class', async () => {
    const req = { method: 'POST', headers: {}, body: { classId: 'A' }, teacher: admin }
    const res = { code: 200, headers: {}, setHeader(name, value) { this.headers[name] = value }, status(code) { this.code = code; return this }, json(data) { this.data = data; return this } }
    await classResetHandler(req, res)
    expect(res).toMatchObject({ code: 403 })
    expect(memory.get('student:PUPIL').auth.scheme).not.toBe('qr-pin-v1')
  })

  it('keeps pilot credentials off legacy pupil reads and full-profile writes', async () => {
    const pilot = { ...profile(), displayAlias: 'Röd Räv 17', auth: createPilotStudentAuth({ qrSecret: createQrSecret(), pin: '1234' }) }
    memory.set('student:PUPIL', pilot)
    expect((await call(studentHandler, 'GET', {}, null)).code).toBe(401)
    expect((await call(studentHandler, 'POST', { profile: pilot }, null)).code).toBe(401)
    expect((await call(studentHandler, 'POST', { profile: pilot }, owner)).code).toBe(405)
    expect((await call(eventsHandler, 'POST', { entries: [{ id: 'pilot-event', type: 'problem_result', payload: result('pilot-event') }] }, null)).code).toBe(401)
    const teacherRead = await call(studentHandler, 'GET', {}, owner)
    expect(teacherRead.code).toBe(200)
    expect(teacherRead.data.profile).toMatchObject({ displayAlias: 'Röd Räv 17' })
    expect(JSON.stringify(teacherRead.data)).not.toMatch(/qrSecretHash|credentialVersion|"pin"/i)
  })

  it('acknowledges teacher patches only at the expected revision and preserves training', async () => {
    const request = { serverRevision: 0, changes: { ticketInbox: { activeDispatchId: 'new' } } }
    expect((await call(studentHandler, 'PATCH', request, owner)).code).toBe(200)
    expect((await call(studentHandler, 'PATCH', request, owner)).code).toBe(409)
    expect((await call(studentHandler, 'PATCH', request, null)).code).toBe(401)
    expect((await call(studentHandler, 'PATCH', { serverRevision: 1, changes: { problemLog: [] } }, owner)).code).toBe(400)
    expect(memory.get('student:PUPIL').ticketInbox.activeDispatchId).toBe('new')
  })

  it('does not acknowledge an invalid event batch', async () => {
    const response = await call(eventsHandler, 'POST', { entries: [{ id: 'invalid', type: 'problem_result', payload: {} }] })
    expect(response.code).toBe(400)
    expect(response.data.ack).toBeUndefined()
  })
  it('retains both concurrent full-profile updates', async () => {
    const base = profile()
    const first = result('first'), second = result('second')
    const responses = await Promise.all([
      call(studentHandler, 'POST', { profile: { ...base, recentProblems: [first], problemLog: [first] } }),
      call(studentHandler, 'POST', { profile: { ...base, recentProblems: [second], problemLog: [second] } })
    ])
    expect(responses.map(res => res.code)).toEqual([200, 200])
    expect(memory.get('student:PUPIL').problemLog.map(p => p.problemId).sort()).toEqual(['first', 'second'])
    expect(memory.get('student:PUPIL').serverRevision).toBe(2)
  })

  it('preserves a legacy mastery fact when a referenced replacement is merged', async () => {
    const stored = memory.get('student:PUPIL')
    stored.masteryFacts = {
      version: 1,
      facts: [{
        id: 'addition:1:legacy',
        operation: 'addition',
        level: 1,
        achievedAt: 1000,
        window: { attempts: 5, correct: 5, rate: 1 },
        source: 'session'
      }],
      revokedIds: []
    }
    memory.set('student:PUPIL', stored)

    const incoming = profile()
    incoming.masteryFacts = {
      version: 1,
      facts: [{
        id: 'addition:1:legacy',
        operation: 'addition',
        level: 1,
        achievedAt: 1000,
        window: { attempts: 5, correct: 5, rate: 1 },
        source: 'session',
        ruleVersion: 1,
        evidenceObservationIds: ['obs-0']
      }, {
        id: 'addition:1:2000',
        operation: 'addition',
        level: 1,
        achievedAt: 2000,
        window: { attempts: 5, correct: 5, rate: 1 },
        source: 'session',
        ruleVersion: 1,
        evidenceObservationIds: ['obs-1']
      }],
      revokedIds: []
    }

    expect((await call(studentHandler, 'POST', { profile: incoming })).code).toBe(200)
    expect(memory.get('student:PUPIL').masteryFacts.facts.map(fact => fact.id)).toEqual([
      'addition:1:legacy',
      'addition:1:2000'
    ])
    expect(memory.get('student:PUPIL').masteryFacts.facts[0].evidenceObservationIds).toEqual(['obs-0'])
  })

  it('retains a simultaneous event and full-profile upload without duplicates', async () => {
    const first = result('first'), second = result('second')
    const batch = { entries: [{ id: 'event-1', type: 'problem_result', timestamp: first.timestamp, payload: first }] }
    await Promise.all([
      call(eventsHandler, 'POST', batch),
      call(studentHandler, 'POST', { profile: { ...profile(), recentProblems: [second], problemLog: [second] } })
    ])
    expect((await call(eventsHandler, 'POST', batch)).data.appliedCount).toBe(0)
    expect(memory.get('student:PUPIL').problemLog).toHaveLength(2)
  })

  it('does not count a repeated table completion twice', async () => {
    const batch = { entries: [{ id: 'table-1', type: 'table_completed', timestamp: 1234, payload: { table: 3 } }] }
    expect((await call(eventsHandler, 'POST', batch)).data.appliedCount).toBe(1)
    expect((await call(eventsHandler, 'POST', batch)).data.appliedCount).toBe(0)
    expect(memory.get('student:PUPIL').tableDrill.completions).toHaveLength(1)
  })

  it('persists an allowlisted pilot checkpoint without changing identity, membership or teacher tickets', async () => {
    memory.get('student:PUPIL').ticketInbox = { activeDispatchId: 'ticket-1', activePayload: { dispatchId: 'ticket-1' } }
    const checkpoint = { entries: [{ id: 'checkpoint-1', type: 'profile_checkpoint', timestamp: 2000, payload: {
      capturedAt: 2000, currentDifficulty: 5, highestDifficulty: 6,
      adaptive: { skillStates: { addition: { level: 5 } } },
      assignmentProgress: { assignmentA: { completedSkillTags: ['skill-1'] } },
      stats: { totalProblems: 12 }
    } }] }
    expect((await call(eventsHandler, 'POST', checkpoint)).data.appliedCount).toBe(1)
    const stored = memory.get('student:PUPIL')
    expect(stored).toMatchObject({ studentId: 'PUPIL', name: 'Same name', classIds: ['A'],
      currentDifficulty: 5, highestDifficulty: 6, pilotCheckpointAt: 2000,
      ticketInbox: { activeDispatchId: 'ticket-1' } })
    expect((await call(eventsHandler, 'POST', { entries: [{ ...checkpoint.entries[0], id: 'checkpoint-stale', payload: { ...checkpoint.entries[0].payload, capturedAt: 1999, currentDifficulty: 2 } }] })).data.appliedCount).toBe(0)
    expect(memory.get('student:PUPIL').currentDifficulty).toBe(5)
  })

  it('derives ticket grading from the active server dispatch and clears only the matching ticket', async () => {
    memory.get('student:PUPIL').ticketInbox = { activeDispatchId: 'ticket-1', activePayload: {
      dispatchId: 'ticket-1', ticketId: 'template-1', title: 'Exit ticket', kind: 'exit',
      question: 'Vad är 1,5 + 0,5?', answer: '2', showCorrectnessOnSubmit: false
    } }
    const answered = await call(eventsHandler, 'POST', { entries: [{ id: 'ticket-answer-1', type: 'ticket_response', timestamp: 3000,
      payload: { dispatchId: 'ticket-1', studentAnswer: '2,0', answeredAt: 3000, responseTimeSec: 12 } }] })
    expect(answered.data.appliedCount).toBe(1)
    expect(memory.get('student:PUPIL').ticketResponses[0]).toMatchObject({
      dispatchId: 'ticket-1', expectedAnswer: '2', studentAnswer: '2,0', isCorrect: true,
      question: 'Vad är 1,5 + 0,5?', showCorrectnessOnSubmit: false
    })
    expect((await call(eventsHandler, 'POST', { entries: [{ id: 'wrong-finish', type: 'ticket_finished', timestamp: 4000,
      payload: { dispatchId: 'ticket-2', finishedAt: 4000 } }] })).data.appliedCount).toBe(0)
    expect((await call(eventsHandler, 'POST', { entries: [{ id: 'right-finish', type: 'ticket_finished', timestamp: 4001,
      payload: { dispatchId: 'ticket-1', finishedAt: 4001 } }] })).data.appliedCount).toBe(1)
    expect(memory.get('student:PUPIL').ticketInbox.activePayload).toBeNull()
  })

  it('rejects oversized or identity-bearing checkpoint fields', async () => {
    const extraIdentity = await call(eventsHandler, 'POST', { entries: [{ id: 'bad-checkpoint', type: 'profile_checkpoint',
      payload: { capturedAt: 1, name: 'Injected' } }] })
    expect(extraIdentity.code).toBe(400)
    const oversized = await call(eventsHandler, 'POST', { entries: [{ id: 'huge-checkpoint', type: 'profile_checkpoint',
      payload: { capturedAt: 1, telemetry: { text: 'x'.repeat(40_000) } } }] })
    expect(oversized.code).toBe(400)
  })

  it('uses live ownership and rejects another teacher for GET, POST, DELETE and events', async () => {
    expect((await call(studentHandler, 'GET', {}, owner)).code).toBe(200)
    const stranger = { teacherId: 'stranger', classIds: ['A'], isAdmin: false }
    for (const method of ['GET', 'POST', 'DELETE']) {
      expect((await call(studentHandler, method, { profile: profile() }, stranger)).code).toBe(403)
    }
    expect((await call(eventsHandler, 'POST', { entries: [{ id: 'e', type: 'problem_result', payload: result('e') }] }, stranger)).code).toBe(403)
  })

  it('removes a deleted pupil from indexed and current-class highscores', async () => {
    memory.set('highscores:pong:A', [
      { studentId: 'PUPIL', name: 'Same name', score: 100 },
      { studentId: 'OTHER', name: 'Other', score: 90 }
    ])
    memory.set('highscores:snake:old-group', [
      { studentId: 'PUPIL', name: 'Same name', score: 80 }
    ])
    memory.set('student_highscore_keys:PUPIL', [
      'highscores:pong:A',
      'highscores:snake:old-group'
    ])

    const response = await call(studentHandler, 'DELETE', {}, owner)

    expect(response).toMatchObject({ code: 200, data: { ok: true, highscoreCleanup: 'complete' } })
    expect(memory.get('highscores:pong:A')).toEqual([
      { studentId: 'OTHER', name: 'Other', score: 90 }
    ])
    expect(memory.get('highscores:snake:old-group')).toEqual([])
    expect(memory.has('student_highscore_keys:PUPIL')).toBe(false)
  })

  it('prevents stale snapshots from restoring identity, class membership or teacher instructions', async () => {
    const incoming = { ...profile(), name: 'Changed', classId: 'B', classIds: ['B'], ticketInbox: { activePayload: {} } }
    expect((await call(studentHandler, 'POST', { profile: incoming }, null)).code).toBe(200)
    const stored = memory.get('student:PUPIL')
    expect(stored.name).toBe('Same name')
    expect(stored.classIds).toEqual(['A'])
    expect(stored.ticketInbox).toBeUndefined()
  })

  it('never recreates a deleted pupil through a stale upload or enrollment', async () => {
    expect((await call(studentHandler, 'DELETE')).code).toBe(200)
    expect((await call(studentHandler, 'POST', { profile: profile() })).code).toBe(410)
    await expect(createStudentRecord('PUPIL', profile())).rejects.toMatchObject({ status: 410 })
    expect(memory.has('student:PUPIL')).toBe(false)
    expect(memory.get('students:index')).toEqual([])
  })

  it('does not restore a removed class from an older training snapshot', async () => {
    const old = profile()
    await deleteClassRecord('A')
    expect(memory.get('student:PUPIL').classIds).toEqual([])
    expect((await call(studentHandler, 'POST', { profile: old }, null)).code).toBe(200)
    expect(memory.get('student:PUPIL').classIds).toEqual([])
    await expect(createClassRecord({ id: 'A', name: 'Old class' })).rejects.toMatchObject({ status: 410 })
  })

  it('lets the same class owner resume deletion after the class tombstone exists', async () => {
    const originalDelete = memory.get.bind(memory)
    let interruptOnce = true
    memory.get = key => {
      if (key === 'student:PUPIL' && interruptOnce) {
        interruptOnce = false
        throw new Error('Synthetic interruption')
      }
      return originalDelete(key)
    }
    expect((await callClass('DELETE', 'A', { ...owner, isAdmin: true })).code).toBe(500)
    expect(memory.has('class_deleted:A')).toBe(true)
    expect(memory.get('class_deletion:A').teacherIds).toEqual(['owner'])
    memory.get = originalDelete
    expect((await callClass('DELETE', 'A', { ...owner, isAdmin: true })).code).toBe(200)
    expect(memory.get('student:PUPIL').classIds).toEqual([])
    expect((await callClass('DELETE', 'A', { teacherId: 'stranger', isAdmin: false })).code).toBe(403)
  })

  it('does not let a concurrent write win over deletion', async () => {
    await Promise.allSettled([
      mutateStudentRecord('PUPIL', async current => ({ ...current, name: 'Old snapshot' })),
      mutateStudentRecord('PUPIL', () => null)
    ])
    expect(memory.has('student:PUPIL')).toBe(false)
    expect(memory.has(studentDeletedKey('PUPIL'))).toBe(true)
    expect(memory.has('student_deleted:PUPIL')).toBe(false)
  })
})
