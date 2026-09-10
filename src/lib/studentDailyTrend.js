import { getPreferredProblemSource } from './masteryCalculation'
import { getStockholmDateKey, getStockholmDaysAgoStart } from './teacherEvidencePeriods'

export const STUDENT_TREND_DAYS = 14
export const TREND_MIN_ATTEMPTS = 6
const SAVED_LOG_LIMIT = 5000

// View-only facts from the preferred saved history; never infer learning gains.
export function buildStudentDailyTrend(profile, now = Date.now()) {
  const source = getPreferredProblemSource(profile)
  const days = Array.from({ length: STUDENT_TREND_DAYS }, (_, index) => {
    const dayStart = getStockholmDaysAgoStart(now, STUDENT_TREND_DAYS - 1 - index)
    const date = getStockholmDateKey(dayStart)
    return {
      date,
      dateLabel: `${Number(date.slice(8))}/${Number(date.slice(5, 7))}`,
      dayStart,
      isToday: index === STUDENT_TREND_DAYS - 1,
      attempts: 0,
      correct: 0
    }
  })
  const byDate = new Map(days.map(day => [day.date, day]))
  let excludedEntries = 0
  for (const problem of source) {
    const timestamp = Number(problem?.timestamp)
    if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > now
      || ![true, false, 1, 0].includes(problem?.correct)) {
      excludedEntries += 1
      continue
    }
    if (timestamp < days[0].dayStart) continue
    const day = byDate.get(getStockholmDateKey(timestamp))
    if (!day) continue
    day.attempts += 1
    if (problem.correct) day.correct += 1
  }

  const hasFullLog = Array.isArray(profile?.problemLog)
  const usesFullLog = hasFullLog && (source === profile.problemLog
    || (profile.problemLog.length === 0 && source.length === 0))
  const lifetimeAttempts = Math.max(
    Number(profile?.stats?.lifetimeProblems) || 0,
    Number(profile?.stats?.totalProblems) || 0
  )
  const historyComplete = usesFullLog && source.length < SAVED_LOG_LIMIT
    && lifetimeAttempts <= source.length && excludedEntries === 0

  return {
    historyComplete,
    excludedEntries,
    days: days.map(day => ({
      ...day,
      accuracy: day.attempts ? day.correct / day.attempts : null,
      smallSample: day.attempts < TREND_MIN_ATTEMPTS
    }))
  }
}
