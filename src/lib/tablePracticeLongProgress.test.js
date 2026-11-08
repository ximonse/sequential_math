import { describe, expect, it } from 'vitest'
import { buildTablePracticeLongHistory, currentTermOf, getLongPeriodRanges, histogramMedian, previousTermOf, weekStartOf } from './tablePracticeLongHistory'
import { buildTablePracticeProgressForPeriod, normalizeTablePeriod } from './tablePracticeLongProgress'

const now = Date.parse('2026-11-08T12:00:00Z')
const at = date => Date.parse(`${date}T10:00:00Z`)

function drill(date, overrides = {}) {
  return { problemType: 'mul_table_drill', skillTag: 'mul_table_7', values: { a: 7, b: 4 }, correct: true, speedTimeSec: 3, timestamp: at(date), ...overrides }
}

function profile(problemLog, overrides = {}) {
  return { problemLog, recentProblems: problemLog.slice(-250), stats: { lifetimeProblems: problemLog.length }, ...overrides }
}

function student(studentId, log, overrides) {
  return { studentId, name: studentId, teacherSummary: { tablePracticeLong: buildTablePracticeLongHistory(profile(log, overrides), now) } }
}

describe('table practice terms and periods', () => {
  it('uses HT August–December and VT January–June, with July outside every term', () => {
    expect(currentTermOf('2026-11-08')).toMatchObject({ key: 'HT2026', start: '2026-08-01', end: '2026-12-31' })
    expect(currentTermOf('2027-01-01')).toMatchObject({ key: 'VT2027', start: '2027-01-01' })
    expect(currentTermOf('2026-12-31').key).toBe('HT2026')
    expect(currentTermOf('2026-07-15').key).toBe('VT2026')
    expect(previousTermOf(currentTermOf('2026-11-08')).key).toBe('VT2026')
    expect(previousTermOf(currentTermOf('2027-03-01')).key).toBe('HT2026')
    const ranges = getLongPeriodRanges(now)
    expect(ranges.term).toMatchObject({ start: '2026-08-01', end: '2026-11-08', label: 'HT 2026' })
    expect(ranges.prevTerm).toMatchObject({ start: '2026-01-01', end: '2026-06-30' })
    expect(ranges.termBefore).toMatchObject({ start: '2025-08-01', end: '2025-12-31' })
    expect(ranges.month).toMatchObject({ start: '2026-10-10', end: '2026-11-08' })
  })

  it('starts weeks on Monday and keeps an exact median in the histogram', () => {
    expect(weekStartOf('2026-11-08')).toBe('2026-11-02')
    expect(weekStartOf('2026-11-02')).toBe('2026-11-02')
    expect(histogramMedian({ 20: 1, 40: 1, 90: 1 })).toBe(4)
    expect(histogramMedian({ 20: 1, 40: 1 })).toBe(3)
    expect(histogramMedian({})).toBeNull()
  })

  it('places answers in month, term, previous term and total without counting July in a term', () => {
    const log = [drill('2026-11-01'), drill('2026-09-01'), drill('2026-07-10'), drill('2026-03-01'), drill('2025-10-01')]
    const long = buildTablePracticeLongHistory(profile(log), now)
    expect(long.periods.month.tables['7'].a).toBe(1)
    expect(long.periods.term.tables['7'].a).toBe(2)
    expect(long.periods.prevTerm.tables['7'].a).toBe(1)
    expect(long.periods.termBefore.tables['7'].a).toBe(1)
    expect(long.periods.total.tables['7'].a).toBe(5)
    expect(long.periods.total.start).toBe('2025-10-01')
  })

  it('keeps a trimmed log complete only for periods after its oldest stored answer', () => {
    const log = [drill('2026-09-15'), drill('2026-11-01')]
    const long = buildTablePracticeLongHistory(profile(log, { stats: { lifetimeProblems: 9000 } }), now)
    expect(long.historyComplete).toBe(false)
    expect(long.periods.month.complete).toBe(true)
    expect(long.periods.term.complete).toBe(false)
    expect(long.periods.total.complete).toBe(false)
  })
})

describe('table practice progress for long periods', () => {
  it('compares this term with the previous one and reports the best weekly median', () => {
    const slowSpring = Array.from({ length: 6 }, () => drill('2026-03-02', { speedTimeSec: 6 }))
    const fasterAutumn = [
      ...Array.from({ length: 6 }, () => drill('2026-09-07', { speedTimeSec: 4 })),
      ...Array.from({ length: 6 }, () => drill('2026-10-05', { speedTimeSec: 2.5 }))
    ]
    const progress = buildTablePracticeProgressForPeriod([student('A', [...slowSpring, ...fasterAutumn])], { table: 7, period: 'term', now })
    const pupil = progress.students[0]
    expect(progress.unit).toBe('week')
    expect(progress.periodLabel).toBe('HT 2026')
    expect(pupil.current.attempts).toBe(12)
    expect(pupil.current.medianTimeSec).toBe(3.25)
    expect(pupil.previous.medianTimeSec).toBe(6)
    expect(pupil.current.bestMedianSec).toBe(2.5)
    expect(pupil.daily[0].date).toBe('2026-07-27')
    expect(pupil.historyComplete).toBe(true)
  })

  it('pools the class median from histograms and has no comparison for total', () => {
    const progress = buildTablePracticeProgressForPeriod([
      student('A', Array.from({ length: 3 }, () => drill('2026-10-01', { speedTimeSec: 2 }))),
      student('B', Array.from({ length: 2 }, () => drill('2026-10-01', { speedTimeSec: 8 })))
    ], { table: 7, period: 'total', now })
    expect(progress.hasPrevious).toBe(false)
    expect(progress.cohort.current.attempts).toBe(5)
    expect(progress.cohort.current.medianTimeSec).toBe(2)
  })

  it('marks pupils without long history as missing evidence instead of zero', () => {
    const progress = buildTablePracticeProgressForPeriod([{ studentId: 'X', name: 'X', teacherSummary: {} }], { table: 7, period: 'prevTerm', now })
    expect(progress.students[0].available).toBe(false)
    expect(progress.cohort.available).toBe(false)
  })

  it('keeps old saved day choices and the short periods working', () => {
    expect(normalizeTablePeriod(14)).toBe('14d')
    expect(normalizeTablePeriod(undefined)).toBe('7d')
    expect(normalizeTablePeriod('prevTerm')).toBe('prevTerm')
    const progress = buildTablePracticeProgressForPeriod([], { table: 7, period: '14d', now })
    expect(progress.days).toBe(14)
    expect(progress.unit).toBe('day')
  })
})
