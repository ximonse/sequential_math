import { describe, expect, it } from 'vitest'
import { evidencePage, practiceEvidence } from './_pupilEvidence.js'
import { evidencePeriod } from '../src/lib/evidencePeriod.js'

const time = Date.parse('2026-10-27T09:00Z')
const row = { timestamp: time, observationId: 'OBS', promptText: '402 − 178',
  studentAnswer: 376, correctAnswer: 224, correct: false, operation: 'subtraction' }
function page(profile, query = {}) {
  return evidencePage({ studentId: 'PUPIL', classId: 'CLASS', source: 'practice',
    period: evidencePeriod('2026-10-27', '2026-10-27'), practice: practiceEvidence(profile),
    screening: { entries: [], coverage: { status: 'not_requested' } }, query })
}

describe('traceable pupil evidence', () => {
  it('keeps correct and incorrect answers without inventing error causes or exposing profile secrets', () => {
    const result = page({ auth: { password: 'SECRET' }, name: 'PRIVATE', problemLog: [row,
      { ...row, observationId: 'RIGHT', correct: true, studentAnswer: 224 },
      { ...row, observationId: 'PARTIAL', isPartial: true },
      { ...row, observationId: 'UNKNOWN', correct: undefined }] })
    expect(result.entries.map(e => e.answer.status).sort()).toEqual(['correct', 'incorrect', 'partial', 'unknown'])
    expect(result.entries[0].interpretation.category).toBe('unknown')
    expect(JSON.stringify(result)).not.toMatch(/SECRET|PRIVATE|password/u)
    expect(result.coverage.practice.completeness).toBe('unknown')
  })
  it('deduplicates only exact stable identities and keeps ambiguous legacy answers', () => {
    const result = page({ problemLog: [row, { ...row }, { ...row, studentAnswer: 300 },
      { ...row, observationId: undefined }, { ...row, observationId: undefined }, { timestamp: null }] })
    expect(result.entries).toHaveLength(4)
    expect(result.coverage.practice).toMatchObject({ duplicateRecords: 1, invalidTimestamps: 1 })
    expect(result.coverage.practice.warnings).toContain('conflicting_observation_ids')
    const legacy = result.entries.filter(e => e.reference.kind === 'legacy_position')
    expect(legacy).toHaveLength(2)
    expect(legacy[0].ref).not.toBe(legacy[1].ref)
  })
  it('marks a recent-history fallback and retains the period end exclusively', () => {
    const period = evidencePeriod('2026-10-27', '2026-10-27')
    const result = page({ recentProblems: [{ ...row, timestamp: period.startInclusive },
      { ...row, observationId: 'END', timestamp: period.endExclusive }] })
    expect(result.total).toBe(1)
    expect(result.coverage.practice.warnings).toContain('recent_problems_fallback')
    expect(result.coverage.practice.latestAvailable).toBe(period.endExclusive)
  })
  it('pages and resolves references within an immutable snapshot and rejects changed evidence', () => {
    const profile = { problemLog: [row, { ...row, observationId: 'RIGHT', correct: true }] }
    const first = page(profile, { limit: 1 })
    const next = page(profile, { limit: 1, cursor: first.nextCursor })
    expect(next.entries[0].ref).not.toBe(first.entries[0].ref)
    expect(next.nextCursor).toBeNull()
    expect(page(profile, { ref: first.entries[0].ref, snapshotRevision: first.snapshotRevision }).entry)
      .toEqual(first.entries[0])
    expect(() => page(profile, { ref: first.entries[0].ref })).toThrow(/snapshotRevision/u)
    expect(() => page(profile, { limit: 101 })).toThrow()
    expect(() => page(profile, { cursor: 'bad' })).toThrow()
    profile.problemLog.push({ ...row, observationId: 'NEW' })
    expect(() => page(profile, { cursor: first.nextCursor })).toThrow(/ändrats/u)
    expect(() => page(profile, { ref: first.entries[0].ref, snapshotRevision: first.snapshotRevision })).toThrow(/ändrats/u)
  })
  it('does not include workspaces in list pages but binds them to detail revisions', () => {
    const args = { studentId: 'P', classId: 'C', source: 'screening', period: evidencePeriod('2026-10-27', '2026-10-27'),
      practice: { entries: [], coverage: {} }, screening: { entries: [{ timestamp: time,
        reference: { attemptId: 'A' }, detail: { snapshot: { events: [{ type: 'write' }] } } }], coverage: {} } }
    const first = evidencePage({ ...args, query: {} })
    expect(first.entries[0]).not.toHaveProperty('detail')
    expect(evidencePage({ ...args, query: { ref: first.entries[0].ref, snapshotRevision: first.snapshotRevision } })
      .entry.detail.snapshot.events).toHaveLength(1)
  })
})
