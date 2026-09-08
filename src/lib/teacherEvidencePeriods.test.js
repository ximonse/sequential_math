import { afterEach, describe, expect, it, vi } from 'vitest'
import { getStockholmDayStart, getStockholmWeekStart } from './teacherEvidencePeriods'
import { deriveTeacherSummary } from './teacherSummary'
import { getStartOfWeekTimestamp } from './studentProfileTimingHelpers'
afterEach(() => vi.useRealTimers())
describe('Stockholm evidence periods', () => {
  it('uses Swedish Monday midnight even while the UTC date is still Sunday', () => {
    const now = Date.parse('2026-09-06T22:30:00Z')
    vi.useFakeTimers(); vi.setSystemTime(now)
    expect(getStockholmWeekStart(now)).toBe(Date.parse('2026-09-06T22:00:00Z'))
    expect(getStartOfWeekTimestamp()).toBe(getStockholmWeekStart(now))
    const profile = { problemLog: [{ timestamp: now - 60000, correct: true }], recentProblems: [] }
    expect(deriveTeacherSummary(profile).currentWeek.attempts).toBe(1)
    expect(deriveTeacherSummary(profile).currentWeek.periodStart).toBe(getStockholmWeekStart(now))
  })
  it('handles the 23-hour and 25-hour daylight saving days', () => {
    const spring = getStockholmDayStart(Date.parse('2026-03-30T12:00:00Z')) - getStockholmDayStart(Date.parse('2026-03-29T12:00:00Z'))
    const autumn = getStockholmDayStart(Date.parse('2026-10-26T12:00:00Z')) - getStockholmDayStart(Date.parse('2026-10-25T12:00:00Z'))
    expect(spring).toBe(23 * 3600000)
    expect(autumn).toBe(25 * 3600000)
  })
  it('marks a capped or known-incomplete full log as limited', () => {
    const problemLog = Array.from({ length: 5000 }, () => ({ timestamp: Date.now() - 60000, correct: true }))
    expect(deriveTeacherSummary({ problemLog, recentProblems: [] }).evidence.historyComplete).toBe(false)
    expect(deriveTeacherSummary({ problemLog: problemLog.slice(0, 2), recentProblems: [], stats: { lifetimeProblems: 3 } }).evidence.historyComplete).toBe(false)
  })
})
