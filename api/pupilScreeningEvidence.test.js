import { afterEach, describe, expect, it, vi } from 'vitest'
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
  afterEach(() => vi.useRealTimers())
  it('reads a long history in bounded waves without dropping or reordering attempts', async () => {
    vi.useFakeTimers()
    const f = fixture(), ids = Array.from({ length: 20 }, (_, i) => `A${i}`)
    let active = 0, peak = 0, calls = 0
    const delayed = async value => {
      calls++; active++; peak = Math.max(peak, active)
      await new Promise(resolve => setTimeout(resolve, 100))
      active--; return structuredClone(value)
    }
    const records = new Map(ids.map(id => [id, { ...f.record, attemptId: id }]))
    const store = {
      smembers: async () => ids,
      get: key => delayed(key.startsWith('diagnostic_attempt:') ? records.get(key.split(':')[1]) : f.data.get(key))
    }
    const read = id => delayed({ record: records.get(id), snapshot: { ...f.snapshot, attemptId: id,
      events: f.snapshot.events.map(event => ({ ...event, attemptId: id, eventId: `${id}:${event.sequence}` })) } })
    const started = Date.now()
    const pending = pupilScreeningEvidence('PUPIL', 'CLASS', { store, read })
    await vi.runAllTimersAsync()
    const result = await pending
    expect(result.entries.map(entry => entry.reference.attemptId)).toEqual(ids)
    expect(result.coverage.invalidRecords).toBe(0)
    expect(calls).toBe(80) // All four reads per attempt still take place.
    expect(peak).toBeLessThanOrEqual(8)
    expect(Date.now() - started).toBeLessThanOrEqual(1500)
  })
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
  it('lets analysis read the teacher judgement while the pupil answer and source references stay', async () => {
    const f = fixture()
    const page = screening => evidencePage({ studentId: 'PUPIL', classId: 'CLASS', source: 'screening',
      period: { from: '2026-10-27', to: '2026-10-27', startInclusive: 1, endExclusive: f.time + 1 },
      screening, practice: { entries: [], coverage: {} }, query: {} })
    const original = page(await pupilScreeningEvidence('PUPIL', 'CLASS', f))
    expect(original.entries[0].answer).toMatchObject({ status: 'incorrect', studentAnswer: '376' })
    expect(original.entries[0].interpretation.predictable.matches.length).toBeGreaterThan(0)
    const review = { studentId: 'PUPIL', reviewRevision: 1, evidenceRevision: 1, evidenceSequence: 1, reviewed: true, note: '',
      markedCorrect: true, teacherAnswer: '', misconception: 'Tar större minus mindre.', updatedAt: f.time }
    f.data.set('diagnostic_review:ATTEMPT', review)
    const judged = page(await pupilScreeningEvidence('PUPIL', 'CLASS', f))
    expect(judged.snapshotRevision).toBe(original.snapshotRevision)
    expect(judged.entries[0].ref).toBe(original.entries[0].ref)
    expect(judged.entries[0].answer).toMatchObject({ status: 'correct', studentAnswer: '376', teacherAssessed: true,
      observed: { status: 'incorrect', studentAnswer: '376' }, teacherMisconceptionSv: 'Tar större minus mindre.' })
    // A wrong answer the teacher counts as right no longer drives an error-model follow-up.
    expect(judged.entries[0].interpretation.predictable.matches ?? []).toHaveLength(0)
    f.data.set('diagnostic_review:ATTEMPT', { ...review, markedCorrect: false, teacherAnswer: '224', misconception: '' })
    expect(page(await pupilScreeningEvidence('PUPIL', 'CLASS', f)).entries[0].answer)
      .toMatchObject({ status: 'correct', studentAnswer: '224', observed: { studentAnswer: '376' } })
    f.data.set('diagnostic_review:ATTEMPT', { ...review, evidenceSequence: 0 })
    expect(page(await pupilScreeningEvidence('PUPIL', 'CLASS', f)).entries[0].answer)
      .toMatchObject({ status: 'incorrect', studentAnswer: '376' })
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
