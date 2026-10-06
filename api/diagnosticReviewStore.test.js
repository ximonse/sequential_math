import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@vercel/kv', () => ({ kv: {} }))
import { kv } from '../robots/memoryKv.js'
import { saveDiagnosticReview, isCurrentDiagnosticReview } from './_diagnosticReviewStore.js'
import { diagnosticClassOverview } from './_diagnosticClassOverview.js'
import { studentDeletedKey } from './_studentStore.js'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'

function work(attemptId, taskId, answer) {
  let grid = createDiagnosticGrid({ attemptId, taskId, taskVersion: 1 })
  grid = recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: answer }, 1)
  grid = recordDiagnosticGridEvent(grid, { type: 'answer_change', before: answer, after: answer }, 2)
  return recordDiagnosticGridEvent(grid, { type: 'submit' }, 3)
}
const firstGrid = work('TRY', 'TASK', '5')

const record = { attemptId: 'TRY', studentId: 'PUPIL', assignmentId: 'ASSIGN', classIdAtAttempt: 'CLASS',
  assignmentItemId: 'ITEM', taskId: 'TASK', taskVersion: 1, evidenceClass: 'diagnostic_only',
  serverRevision: 2, lastSequence: 3, status: 'submitted', grid: { ...firstGrid, events: undefined } }
const assignment = { assignmentId: 'ASSIGN', classId: 'CLASS', studentIds: ['PUPIL', 'WAITING', 'OUTSIDE'],
  items: [{ assignmentItemId: 'ITEM', taskId: 'TASK', taskVersion: 1, taskSnapshot: { taskId: 'TASK', taskVersion: 1, operation: 'addition', operands: [2, 3], answerRule: 'integer_addition', promptSv: 'Räkna ut 2 + 3.' } },
    { assignmentItemId: 'SECOND', taskId: 'TASK2', taskVersion: 1, taskSnapshot: { taskId: 'TASK2', taskVersion: 1, operation: 'addition', operands: [4, 5], answerRule: 'integer_addition', promptSv: 'Räkna ut 4 + 5.' } }] }
const input = { expectedReviewRevision: 0, evidenceRevision: 2, evidenceSequence: 3, reviewed: true, note: 'Fråga om växlingen.' }
beforeEach(async () => {
  kv._reset()
  await kv.set('diagnostic_attempt:TRY', record)
  await kv.set('diagnostic_attempt_events:TRY', firstGrid.events)
  await kv.set('student:PUPIL', { studentId: 'PUPIL', classId: 'CLASS' })
  await kv.set('class:CLASS', { id: 'CLASS' })
  await kv.set('diagnostic_assignment:ASSIGN', assignment)
  await kv.sadd('diagnostic_attempts_by_assignment:ASSIGN', 'TRY')
})

describe('revision-bound diagnostic teacher reviews', () => {
  it('persists shared review metadata without mutating pupil evidence', async () => {
    const review = await saveDiagnosticReview(record, input, 'ADMIN', { store: kv, now: 123 })
    expect(await kv.get('diagnostic_review:TRY')).toEqual(review)
    expect(review).toMatchObject({ reviewRevision: 1, updatedBy: 'ADMIN', updatedAt: 123 })
    expect(await kv.get('diagnostic_attempt:TRY')).toEqual(record)
    expect(isCurrentDiagnosticReview(review, record)).toBe(true)
    expect(isCurrentDiagnosticReview(review, { ...record, serverRevision: 3 })).toBe(false)
  })
  it('rejects competing teacher edits and stale pupil evidence without overwriting the first note', async () => {
    await saveDiagnosticReview(record, input, 'ADMIN', { store: kv })
    await expect(saveDiagnosticReview(record, { ...input, note: 'Other note' }, 'SECOND', { store: kv })).rejects.toMatchObject({ status: 409 })
    expect((await kv.get('diagnostic_review:TRY')).note).toBe(input.note)
    await kv.set('diagnostic_attempt:TRY', { ...record, serverRevision: 3 })
    await expect(saveDiagnosticReview(record, { ...input, expectedReviewRevision: 1 }, 'ADMIN', { store: kv })).rejects.toMatchObject({ status: 409 })
  })
  it('checks pupil deletion, current membership and frozen assignment again at write time', async () => {
    await kv.set(studentDeletedKey('PUPIL'), 'deleted')
    await expect(saveDiagnosticReview(record, input, 'ADMIN', { store: kv })).rejects.toMatchObject({ status: 410 })
    await kv.del(studentDeletedKey('PUPIL'))
    await kv.set('student:PUPIL', { classId: 'OTHER' })
    await expect(saveDiagnosticReview(record, input, 'ADMIN', { store: kv })).rejects.toMatchObject({ status: 410 })
    expect(await kv.get('diagnostic_review:TRY')).toBeNull()
  })
  it('rejects oversized/free-form invalid requests before storage mutation', async () => {
    for (const patch of [{ note: 'x'.repeat(1001) }, { reviewed: 'yes' }, { expectedReviewRevision: -1 }, { evidenceSequence: 1.5 }]) {
      await expect(saveDiagnosticReview(record, { ...input, ...patch }, 'ADMIN', { store: kv })).rejects.toMatchObject({ status: 400 })
    }
    expect(await kv.get('diagnostic_review:TRY')).toBeNull()
  })
  it('counts unopened, started, submitted and current reviewed items without exposing foreign pupils or notes', async () => {
    await saveDiagnosticReview(record, input, 'ADMIN', { store: kv })
    let overview = await diagnosticClassOverview(assignment, ['PUPIL', 'WAITING'], { store: kv })
    expect(overview.rows).toHaveLength(2)
    expect(overview.rows[0]).toMatchObject({ status: 'in_progress', submitted: 1, remaining: 1, reviewed: 1 })
    expect(overview.rows[1]).toMatchObject({ status: 'not_started', submitted: 0, remaining: 2, reviewed: 0 })
    expect(JSON.stringify(overview)).not.toContain(input.note)
    expect(overview.rows[0].items[0].screening).toMatchObject({ explicitAnswer: '5', expectedAnswer: 5, answerStatus: 'correct', signals: [] })
    expect(overview.rows[1].items[0].screening).toBeNull()
    const secondGrid = work('SECONDTRY', 'TASK2', '9')
    await kv.set('diagnostic_attempt:SECONDTRY', { ...record, attemptId: 'SECONDTRY', assignmentItemId: 'SECOND', taskId: 'TASK2', grid: { ...secondGrid, events: undefined } })
    await kv.set('diagnostic_attempt_events:SECONDTRY', secondGrid.events)
    await kv.sadd('diagnostic_attempts_by_assignment:ASSIGN', 'SECONDTRY')
    overview = await diagnosticClassOverview(assignment, ['PUPIL'], { store: kv })
    expect(overview.rows[0]).toMatchObject({ status: 'submitted', submitted: 2, remaining: 0 })
    await kv.set('diagnostic_attempt:TRY', { ...record, serverRevision: 3 })
    expect((await diagnosticClassOverview(assignment, ['PUPIL'], { store: kv })).rows[0].reviewed).toBe(0)
  })
})
