import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@vercel/kv', () => ({ kv: Object.fromEntries(['get', 'set', 'eval', 'scan', 'exists', 'smembers', 'srem', 'del', 'lrange'].map(method => [method,
  async (...args) => (await import('../robots/memoryKv.js')).kv[method](...args)])) }))
import { kv } from '../robots/memoryKv.js'
import { retirePupil, FINISH_PUPIL_LIFECYCLE_SCRIPT } from './_pupilLifecycle.js'
import { studentDeletedKey } from './_studentStore.js'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'
import manifest from '../src/domains/arithmetic/diagnosticTasks.v1.json'
import { writePupilReferences } from './_pupilReferenceWrite.js'

const authorize = async () => {}
beforeEach(() => { kv._reset(); vi.restoreAllMocks() })

async function seed() {
  await kv.set('student:PUPIL', { studentId: 'PUPIL', name: 'Private Name', preferredName: 'Private Name',
    displayAlias: 'Secret Code', grade: 6, classIds: ['A'], serverRevision: 1,
    stats: { totalProblems: 2, correctAnswers: 1, lifetimeProblems: 2 },
    problemLog: [{ timestamp: 100000000, correct: true, operation: 'addition', studentAnswer: 4,
      correctAnswer: 4, promptText: 'Private Name', studentId: 'PUPIL', classIdAtAttempt: 'A' },
    { timestamp: 100000100, correct: false, operation: 'subtraction', studentAnswer: 3, correctAnswer: 2 }],
    auth: { passwordHash: 'never-copy-this' } })
  await kv.set('student:OTHER', { studentId: 'OTHER', name: 'Other Name' })
  await kv.sadd('students:index', 'PUPIL', 'OTHER')
  await kv.sadd('class_students:A', 'PUPIL', 'OTHER')
  await kv.set('teacher_pupil_labels:T', { PUPIL: 'Private Name', OTHER: 'Other Name' })
  await kv.set('group:G', { pupilIds: ['PUPIL', 'OTHER'], serverRevision: 2 })
  await kv.set('highscores:pong:old-class', [{ studentId: 'PUPIL', name: 'Private Name', score: 50 }, { studentId: 'OTHER', score: 60 }])
  await kv.set('student_session:old-session', { studentId: 'PUPIL' })
  await kv.set('student_session:legacy-session', 'PUPIL')
  await kv.set('student_session:keeper', { studentId: 'OTHER' })
  await kv.set('student_login_code:old-code', 'PUPIL')
  // This old assignment deliberately has no pupil index.
  await kv.set('diagnostic_assignment:ASSIGN', { assignmentId: 'ASSIGN', classId: 'A',
    studentIds: ['PUPIL', 'OTHER'], items: [{ assignmentItemId: 'ITEM' }] })
  await kv.set('diagnostic_attempt:ATTEMPT', { attemptId: 'ATTEMPT', studentId: 'PUPIL',
    assignmentId: 'ASSIGN', assignmentItemId: 'ITEM' })
  await kv.set('diagnostic_attempt_events:ATTEMPT', [{ private: 'work' }])
  await kv.set('diagnostic_active:PUPIL:ITEM', 'ATTEMPT')
  await kv.sadd('diagnostic_attempts_by_assignment:ASSIGN', 'ATTEMPT', 'OTHER-ATTEMPT')
}

describe('pupil lifecycle', () => {
  it('removes indexed orphan events on deletion and rejects incomplete anonymization', async () => {
    await seed()
    await kv.sadd('diagnostic_attempts_by_student:PUPIL', 'ORPHAN')
    await kv.set('diagnostic_attempt_events:ORPHAN', [{ private: 'orphan work' }])
    await retirePupil('PUPIL', 'delete', authorize)
    expect(await kv.get('diagnostic_attempt_events:ORPHAN')).toBeNull()
    kv._reset()
    await seed()
    await kv.sadd('diagnostic_attempts_by_student:PUPIL', 'ORPHAN')
    await expect(retirePupil('PUPIL', 'anonymize', authorize)).rejects.toThrow('ofullständigt')
    expect(await kv.smembers('pupil_analysis:index')).toEqual([])
  })
  it('deletes all pupil resources without creating an archive or touching another pupil', async () => {
    await seed()
    expect(await retirePupil('PUPIL', 'delete', authorize)).toMatchObject({ ok: true, deleted: true })
    for (const key of ['student:PUPIL', 'student_session:old-session', 'student_session:legacy-session',
      'student_login_code:old-code', 'diagnostic_attempt:ATTEMPT', 'diagnostic_attempt_events:ATTEMPT',
      'diagnostic_active:PUPIL:ITEM', 'pupil_lifecycle:PUPIL']) expect(await kv.get(key)).toBeNull()
    expect(await kv.smembers('pupil_analysis:index')).toEqual([])
    expect(await kv.smembers('class_students:A')).toEqual(['OTHER'])
    expect(await kv.get('teacher_pupil_labels:T')).toEqual({ OTHER: 'Other Name' })
    expect((await kv.get('group:G')).pupilIds).toEqual(['OTHER'])
    expect((await kv.get('diagnostic_assignment:ASSIGN')).studentIds).toEqual(['OTHER'])
    expect(await kv.smembers('diagnostic_attempts_by_assignment:ASSIGN')).toEqual(['OTHER-ATTEMPT'])
    expect(await kv.get('student_session:keeper')).toEqual({ studentId: 'OTHER' })
    expect(await kv.get('student:OTHER')).toEqual({ studentId: 'OTHER', name: 'Other Name' })
    expect(await kv.exists(studentDeletedKey('PUPIL'))).toBe(1)
  })
  it('anonymizes to a frozen analysis series without names, identities or credentials', async () => {
    await seed()
    // No diagnostic work in this fixture; corrupt diagnostic work must not be silently omitted.
    await kv.del('diagnostic_attempt:ATTEMPT', 'diagnostic_attempt_events:ATTEMPT')
    const result = await retirePupil('PUPIL', 'anonymize', authorize)
    const archive = await kv.get(`pupil_analysis:${result.archiveId}`)
    expect(archive.training.attempts).toHaveLength(2)
    expect(archive.training.attempts.map(attempt => attempt.timestamp)).toEqual([100000000, 100000100])
    expect(archive.training.totals).toEqual({ totalProblems: 2, correctAnswers: 1, lifetimeProblems: 2 })
    expect(archive.frozen).toBe(true)
    for (const privateText of ['Private Name', 'Secret Code', 'PUPIL', 'never-copy-this', 'classIdAtAttempt']) {
      expect(JSON.stringify(archive)).not.toContain(privateText)
    }
    expect(await kv.get('student:PUPIL')).toBeNull()
    expect(await kv.smembers('pupil_lifecycle_pending')).toEqual([])
    expect(await kv.get('teacher_pupil_labels:T')).toEqual({ OTHER: 'Other Name' })
  })
  it('can resume a failed cleanup without publishing an incomplete archive', async () => {
    await seed()
    const original = kv.eval.bind(kv)
    let fail = true
    vi.spyOn(kv, 'eval').mockImplementation(async (script, keys, args) => {
      if (script === FINISH_PUPIL_LIFECYCLE_SCRIPT && fail) throw new Error('offline')
      return original(script, keys, args)
    })
    await expect(retirePupil('PUPIL', 'delete', authorize)).rejects.toThrow('offline')
    expect(await kv.get('student:PUPIL')).toBeNull()
    expect(await kv.smembers('pupil_lifecycle_pending')).toEqual(['PUPIL'])
    expect(await kv.get('diagnostic_attempt:ATTEMPT')).not.toBeNull()
    await expect(retirePupil('PUPIL', 'anonymize', authorize)).rejects.toMatchObject({ status: 409 })
    fail = false
    await retirePupil('PUPIL', 'delete', authorize)
    expect(await kv.get('diagnostic_attempt:ATTEMPT')).toBeNull()
    expect(await kv.smembers('pupil_lifecycle_pending')).toEqual([])
    expect(await retirePupil('PUPIL', 'delete', authorize)).toMatchObject({ ok: true })
  })
  it('retries shared-record conflicts and preserves concurrent teacher edits', async () => {
    await seed()
    const original = kv.eval.bind(kv)
    let once = true
    vi.spyOn(kv, 'eval').mockImplementation(async (script, keys, args) => {
      if (script === FINISH_PUPIL_LIFECYCLE_SCRIPT && once) {
        once = false
        await kv.set('teacher_pupil_labels:T', { PUPIL: 'Private Name', OTHER: 'Changed Name' })
      }
      return original(script, keys, args)
    })
    await retirePupil('PUPIL', 'delete', authorize)
    expect(await kv.get('teacher_pupil_labels:T')).toEqual({ OTHER: 'Changed Name' })
  })
  it('does not change anything when authorization fails', async () => {
    await seed()
    await expect(retirePupil('PUPIL', 'delete', async () => { throw new Error('forbidden') })).rejects.toThrow('forbidden')
    expect(await kv.get('student:PUPIL')).not.toBeNull()
    expect(await kv.exists(studentDeletedKey('PUPIL'))).toBe(0)
  })
  it('preserves diagnostic analysis points while deleting the original calculation', async () => {
    await seed()
    const task = manifest.tasks[0]
    const snapshot = recordDiagnosticGridEvent(createDiagnosticGrid({ attemptId: 'ATTEMPT', taskId: task.taskId,
      taskVersion: task.taskVersion }), { type: 'answer_change', before: '', after: '699' }, 1000)
    await kv.set('diagnostic_assignment:ASSIGN', { assignmentId: 'ASSIGN', classId: 'A', studentIds: ['PUPIL'],
      items: [{ assignmentItemId: 'ITEM', taskSnapshot: task }] })
    await kv.set('diagnostic_attempt:ATTEMPT', { attemptId: 'ATTEMPT', studentId: 'PUPIL',
      assignmentId: 'ASSIGN', assignmentItemId: 'ITEM', grid: { ...snapshot, events: [] },
      taskId: task.taskId, taskVersion: task.taskVersion, lastSequence: 1, serverRevision: 1,
      evidenceClass: 'diagnostic_only', status: 'in_progress', createdAt: 1767139200000 })
    await kv.set('diagnostic_attempt_events:ATTEMPT', snapshot.events)
    const result = await retirePupil('PUPIL', 'anonymize', authorize)
    const archive = await kv.get(`pupil_analysis:${result.archiveId}`)
    expect(archive.diagnostics.points).toHaveLength(1)
    expect(archive.diagnostics.points[0]).toMatchObject({ answerStatus: 'correct', month: '2025-12' })
    expect(JSON.stringify(archive.diagnostics)).not.toMatch(/PUPIL|699|ATTEMPT|events|cells/)
    expect(await kv.get('diagnostic_attempt_events:ATTEMPT')).toBeNull()
    expect(await kv.get('diagnostic_assignment:ASSIGN')).toBeNull()
  })
  it('refuses to publish statistics from corrupt diagnostic work', async () => {
    await seed()
    await expect(retirePupil('PUPIL', 'anonymize', authorize)).rejects.toMatchObject({ status: 409 })
    expect(await kv.smembers('pupil_analysis:index')).toEqual([])
    expect(await kv.get('diagnostic_attempt_events:ATTEMPT')).not.toBeNull()
  })
  it('removes ticket targets and prevents stale label/workspace/score writes from restoring retired pupils', async () => {
    await seed()
    await kv.set('teacher_workspace:T:ticketDispatches', [{ id: 'D', targetStudentIds: ['PUPIL', 'OTHER'] }])
    await retirePupil('PUPIL', 'delete', authorize)
    expect(await kv.get('teacher_workspace:T:ticketDispatches')).toEqual([{ id: 'D', targetStudentIds: ['OTHER'] }])
    await writePupilReferences('teacher_pupil_labels:T', { PUPIL: 'Restored Name', OTHER: 'Other Name' }, { labels: true, store: kv })
    expect(await kv.get('teacher_pupil_labels:T')).toEqual({ OTHER: 'Other Name' })
    await writePupilReferences('highscores:pong:A', [{ studentId: 'PUPIL', name: 'Restored Name' }], { store: kv })
    expect(await kv.get('highscores:pong:A')).toEqual([])
  })
})
