import { describe, expect, it } from 'vitest'
import { buildStudentDailyTrend } from './studentDailyTrend'

const NOW = Date.parse('2026-09-09T12:00:00Z')
const answer = (time, correct = true) => ({ timestamp: Date.parse(time), correct })
const profile = problemLog => ({ problemLog, recentProblems: [], stats: { lifetimeProblems: problemLog.length } })

describe('student daily trend', () => {
  it('includes today and the previous 13 Stockholm calendar days, oldest first', () => {
    const result = buildStudentDailyTrend(profile([]), NOW)
    expect(result.days).toHaveLength(14)
    expect(result.days[0].date).toBe('2026-08-27')
    expect(result.days.at(-1)).toMatchObject({ date: '2026-09-09', isToday: true, attempts: 0, accuracy: null, smallSample: true })
    expect(result.historyComplete).toBe(true)
  })

  it('uses Stockholm midnight, includes the first boundary and excludes older and future answers', () => {
    const result = buildStudentDailyTrend(profile([
      answer('2026-08-26T21:59:59.999Z'),
      answer('2026-08-26T22:00:00Z'),
      answer('2026-09-08T21:59:59.999Z', false),
      answer('2026-09-08T22:00:00Z'),
      answer('2026-09-09T12:00:00Z'),
      answer('2026-09-09T12:00:00.001Z')
    ]), NOW)
    expect(result.days[0].attempts).toBe(1)
    expect(result.days.at(-2)).toMatchObject({ attempts: 1, correct: 0, accuracy: 0 })
    expect(result.days.at(-1)).toMatchObject({ attempts: 2, correct: 2, accuracy: 1 })
    expect(result.excludedEntries).toBe(1)
  })

  it.each([
    ['spring', '2026-03-30T12:00:00Z', '2026-03-29', 23, [
      '2026-03-28T23:00:00Z', '2026-03-29T00:30:00Z',
      '2026-03-29T01:30:00Z', '2026-03-29T21:59:59.999Z'
    ], '2026-03-29T22:00:00Z'],
    ['autumn', '2026-10-26T12:00:00Z', '2026-10-25', 25, [
      '2026-10-24T22:00:00Z', '2026-10-25T00:30:00Z',
      '2026-10-25T01:30:00Z', '2026-10-25T22:59:59.999Z'
    ], '2026-10-25T23:00:00Z']
  ])('counts the entire %s DST day exactly once', (_, now, date, hours, times, nextMidnight) => {
    const result = buildStudentDailyTrend(profile([...times, nextMidnight].map(time => answer(time))), Date.parse(now))
    const index = result.days.findIndex(day => day.date === date)
    expect(result.days[index].attempts).toBe(4)
    expect(result.days[index + 1].attempts).toBe(1)
    expect(result.days[index + 1].dayStart - result.days[index].dayStart).toBe(hours * 3600000)
    expect(new Set(result.days.map(day => day.date)).size).toBe(14)
  })

  it.each([
    ['2027-01-02T00:00:00Z', '2026-12-20', '2027-01-02'],
    ['2028-03-01T00:00:00Z', '2028-02-17', '2028-03-01']
  ])('crosses year and leap-month boundaries for %s', (now, first, last) => {
    const result = buildStudentDailyTrend(profile([]), Date.parse(now))
    expect(result.days[0].date).toBe(first)
    expect(result.days.at(-1).date).toBe(last)
    expect(result.days).toHaveLength(14)
  })

  it('marks five answers as small and six as sufficient for a neutral connecting line', () => {
    const log = [
      ...Array.from({ length: 5 }, () => answer('2026-09-08T12:00:00Z')),
      ...Array.from({ length: 6 }, (_, index) => answer('2026-09-09T11:00:00Z', index < 3))
    ]
    const result = buildStudentDailyTrend(profile(log), NOW)
    expect(result.days.at(-2)).toMatchObject({ attempts: 5, accuracy: 1, smallSample: true })
    expect(result.days.at(-1)).toMatchObject({ attempts: 6, correct: 3, accuracy: 0.5, smallSample: false })
  })

  it('uses the preferred full log instead of double counting the recent sample', () => {
    const log = Array.from({ length: 300 }, () => answer('2026-09-09T11:00:00Z'))
    const result = buildStudentDailyTrend({ ...profile(log), recentProblems: log.slice(-2) }, NOW)
    expect(result.days.at(-1).attempts).toBe(300)
    expect(result.historyComplete).toBe(true)
  })

  it.each([
    { recentProblems: [answer('2026-09-09T11:00:00Z')] },
    { problemLog: [], recentProblems: [], stats: { lifetimeProblems: 1 } },
    { problemLog: [answer('2026-09-09T11:00:00Z')], stats: { totalProblems: 3 } },
    { problemLog: Array.from({ length: 5000 }, () => answer('2026-09-09T11:00:00Z')) },
    { problemLog: [answer('2026-09-08T11:00:00Z')], recentProblems: [answer('2026-09-09T11:00:00Z')] },
    {}
  ])('marks incomplete, legacy, capped or unavailable history', input => {
    expect(buildStudentDailyTrend(input, NOW).historyComplete).toBe(false)
  })

  it('excludes malformed records and marks the resulting evidence as limited', () => {
    const result = buildStudentDailyTrend(profile([
      null, { timestamp: NaN, correct: true }, { timestamp: NOW },
      { timestamp: 0, correct: true }, { timestamp: NOW, correct: 'false' },
      { timestamp: NOW, correct: false }
    ]), NOW)
    expect(result.excludedEntries).toBe(5)
    expect(result.historyComplete).toBe(false)
    expect(result.days.at(-1)).toMatchObject({ attempts: 1, correct: 0, accuracy: 0 })
  })

  it('does not mutate saved history or trust an old completeness summary', () => {
    const input = { problemLog: [], stats: { lifetimeProblems: 10 }, teacherSummary: { evidence: { historyComplete: true } } }
    const before = structuredClone(input)
    expect(buildStudentDailyTrend(input, NOW).historyComplete).toBe(false)
    expect(input).toEqual(before)
  })
})
