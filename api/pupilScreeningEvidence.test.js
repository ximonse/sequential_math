import { describe, expect, it } from 'vitest'
import { pupilScreeningEvidence } from './_pupilScreeningEvidence.js'
import { evidencePage } from './_pupilEvidence.js'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'

function fixture() {
  const time = Date.parse('2026-10-27T09:00Z')
  const task = { taskId: 'TASK', taskVersion: 1, promptSv: '402 − 178', operation: 'subtraction',
    operands: [402, 178], answerRule: 'integer_subtraction' }
  let snapshot = createDiagnosticGrid({ attemptId: 'ATTEMPT', taskId: 'TASK', taskVersion: 1 })
  snapshot = recordDiagnosticGridEvent(snapshot, { type: 'answer_change', before: '', after: '376' }, time)
  const record = { attemptId: 'ATTEMPT', taskId: 'TASK', taskVersion: 1, assignmentId: 'ASSIGNMENT',
    assignmentItemId: 'ITEM', studentId: 'PUPIL', classIdAtAttempt: 'CLASS', evidenceClass: 'diagnostic_only',
    serverRevision: 1, lastSequence: 1, status: 'in_progress', createdAt: time - 1000 }
  const data = new Map([
    ['diagnostic_attempt:ATTEMPT', record],
    ['diagnostic_assignment:ASSIGNMENT', { assignmentId: 'ASSIGNMENT', classId: 'CLASS',
      studentIds: ['PUPIL'], evidenceClass: 'diagnostic_only',
      items: [{ assignmentItemId: 'ITEM', taskId: 'TASK', taskVersion: 1, taskSnapshot: task }] }],
    ['diagnostic_attempt:OTHER', { ...record, studentId: 'OTHER', attemptId: 'OTHER' }],
  ])
  const store = { smembers: async () => ['ATTEMPT', 'OTHER'], get: async key => data.get(key) }
  return { data, record, snapshot, store, read: async () => ({ record, snapshot }), time }
}

describe('screening evidence preserves original work and version identity', () => {
  it('carries a separately versioned teacher review without changing original source references', async () => {
    const f = fixture()
    const page = screening => evidencePage({ studentId: 'PUPIL', classId: 'CLASS', source: 'screening',
      period: { from: '2026-10-27', to: '2026-10-27', startInclusive: 1, endExclusive: f.time + 1 },
      screening, practice: { entries: [], coverage: {} }, query: {} })
    const original = page(await pupilScreeningEvidence('PUPIL', 'CLASS', f))
    f.data.set('diagnostic_review:ATTEMPT', { studentId: 'PUPIL', reviewRevision: 2,
      evidenceRevision: 1, evidenceSequence: 1, reviewed: true, note: 'Ask about exchange', updatedAt: f.time })
    const reviewed = page(await pupilScreeningEvidence('PUPIL', 'CLASS', f))
    expect(reviewed.snapshotRevision).toBe(original.snapshotRevision)
    expect(reviewed.entries[0].ref).toBe(original.entries[0].ref)
    expect(reviewed.entries[0].teacherReview).toMatchObject({ matchesEvidence: true, noteSv: 'Ask about exchange' })
    expect(reviewed.entries[0].interpretation.work.reference).toEqual(reviewed.entries[0].reference)
    f.data.get('diagnostic_review:ATTEMPT').evidenceSequence = 0
    const stale = page(await pupilScreeningEvidence('PUPIL', 'CLASS', f))
    expect(stale.entries[0].teacherReview.matchesEvidence).toBe(false)
    expect(stale.entries[0].ref).toBe(original.entries[0].ref)
  })
  it('returns only the selected pupil and frozen item with its actual answer and saved original', async () => {
    const f = fixture()
    const result = await pupilScreeningEvidence('PUPIL', 'CLASS', f)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]).toMatchObject({ timestamp: f.time, source: 'screening',
      reference: { observationRevisionId: 'ATTEMPT:r1:s1' },
      answer: { studentAnswer: '376', correctAnswer: 224, status: 'incorrect', submitted: false },
      context: { evidenceClass: 'diagnostic_only' } })
    expect(result.entries[0].detail.snapshot).toEqual(f.snapshot)
    expect(JSON.stringify(result)).not.toContain('OTHER')
  })
  it('marks missing frozen assignments instead of manufacturing a question', async () => {
    const f = fixture()
    f.data.delete('diagnostic_assignment:ASSIGNMENT')
    const result = await pupilScreeningEvidence('PUPIL', 'CLASS', f)
    expect(result.entries).toHaveLength(0)
    expect(result.coverage.invalidRecords).toBe(1)
  })
  it('rejects identity changes between index read and original-work read', async () => {
    const f = fixture()
    f.read = async () => ({ record: { ...f.record, studentId: 'OTHER' }, snapshot: f.snapshot })
    await expect(pupilScreeningEvidence('PUPIL', 'CLASS', f)).rejects.toMatchObject({ status: 409 })
  })
})
