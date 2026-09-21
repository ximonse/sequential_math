import { median } from '../../../lib/mathUtils'
import { getOperationLabel } from '../../../lib/operations'
import { getStartOfDayTimestamp } from './dashboardCoreHelpers'
import {
  clampUnit,
  increaseCount,
  toTopEntries
} from './dashboardSortUtils'

const DAY_MS = 24 * 60 * 60 * 1000

export function buildDataQualitySummary(rows) {
  const list = Array.isArray(rows) ? rows : []
  const totalStudents = list.length
  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      withTelemetry: 0,
      withPresenceToday: 0,
      sessionGapStudents: 0,
      answerMismatchStudents: 0,
      contractEvidence: 0,
      legacyClassifiedEvidence: 0,
      unknownEvidence: 0,
      studentsWithUnknownEvidence: 0,
      needsFollowUpNames: [],
      overallQuality: 0
    }
  }

  const startToday = getStartOfDayTimestamp()
  const withTelemetry = list.filter(row => (row.telemetryEventCount || 0) > 0).length
  const withPresenceToday = list.filter(row => Number(row.presenceLastSeenAt || 0) >= startToday).length
  const sessionGapStudents = list.filter(row => (
    Number(row.todayPracticeSessionsStarted || 0) > Number(row.todayPracticeSessionsEnded || 0)
  )).length
  const answerMismatchStudents = list.filter(row => (
    Math.abs(Number(row.todayPracticeAnswersTelemetry || 0) - Number(row.todayAttempts || 0)) >= 4
  )).length
  const evidenceTotals = list.reduce((totals, row) => {
    const classification = row?.evidenceClassification || {}
    totals.contractEvidence += Number(classification.contract || 0)
    totals.legacyClassifiedEvidence += Number(classification.legacyClassified || 0)
    totals.unknownEvidence += Number(classification.unknown || 0)
    if (Number(classification.unknown || 0) > 0) totals.studentsWithUnknownEvidence += 1
    return totals
  }, { contractEvidence: 0, legacyClassifiedEvidence: 0, unknownEvidence: 0, studentsWithUnknownEvidence: 0 })

  const needsFollowUpNames = list
    .filter(row => (
      (row.hasLoggedIn && (row.telemetryEventCount || 0) === 0)
      || (Number(row.todayPracticeSessionsStarted || 0) > Number(row.todayPracticeSessionsEnded || 0))
      || (Math.abs(Number(row.todayPracticeAnswersTelemetry || 0) - Number(row.todayAttempts || 0)) >= 4)
    ))
    .map(row => row.name)
    .slice(0, 8)

  const telemetryCoverage = withTelemetry / totalStudents
  const presenceCoverage = withPresenceToday / totalStudents
  const sessionGapScore = 1 - (sessionGapStudents / totalStudents)
  const mismatchScore = 1 - (answerMismatchStudents / totalStudents)
  const overallQuality = clampUnit((telemetryCoverage + presenceCoverage + sessionGapScore + mismatchScore) / 4)

  return {
    totalStudents,
    withTelemetry,
    withPresenceToday,
    sessionGapStudents,
    answerMismatchStudents,
    ...evidenceTotals,
    needsFollowUpNames,
    overallQuality
  }
}

export function buildUsageInsights(rows, students) {
  const safeRows = Array.isArray(rows) ? rows : []
  const safeStudents = Array.isArray(students) ? students : []
  const activeStudents = safeRows.filter(row => (
    Number(row.todayEngagedMinutes || 0) > 0
    || Number(row.todayPracticeAnswersTelemetry || 0) > 0
    || Number(row.todayTicketSubmitted || 0) > 0
  ))
  const totalEngagedSeconds = safeRows.reduce((sum, row) => sum + (Number(row.todayEngagedMinutes || 0) * 60), 0)
  const avgEngagedSecondsPerActiveStudent = activeStudents.length > 0
    ? totalEngagedSeconds / activeStudents.length
    : 0

  const breakPrompts = safeRows.reduce((sum, row) => sum + Number(row.todayBreakPromptsShown || 0), 0)
  const breaksTaken = safeRows.reduce((sum, row) => sum + Number(row.todayBreaksTaken || 0), 0)
  const breakTakeRate = breakPrompts > 0 ? breaksTaken / breakPrompts : null

  const ticketSubmittedToday = safeRows.reduce((sum, row) => sum + Number(row.todayTicketSubmitted || 0), 0)
  const ticketCorrectToday = safeRows.reduce((sum, row) => sum + Number(row.todayTicketCorrect || 0), 0)
  const ticketAccuracyToday = ticketSubmittedToday > 0 ? ticketCorrectToday / ticketSubmittedToday : null

  const launchCounts = new Map()
  const errorCategoryCounts = new Map()
  const sessionDurations = []
  const weekStart = Date.now() - (7 * DAY_MS)

  for (const student of safeStudents) {
    const events = Array.isArray(student?.telemetry?.events) ? student.telemetry.events : []
    for (const event of events) {
      const ts = Number(event?.ts || 0)
      if (!Number.isFinite(ts) || ts < weekStart) continue
      const type = String(event?.type || '')
      const payload = event?.payload && typeof event.payload === 'object' ? event.payload : {}

      if (type === 'practice_launch_free') {
        increaseCount(launchCounts, 'Fri träning')
      } else if (type === 'practice_launch_table_drill') {
        increaseCount(launchCounts, 'Tabellträning')
      } else if (type === 'practice_launch_assignment_or_free') {
        increaseCount(launchCounts, payload.assignmentId ? 'Uppdrag' : 'Fri/Uppdrag')
      } else if (type === 'practice_launch_operation') {
        increaseCount(launchCounts, getOperationLabel(String(payload.operation || 'okänd')))
      }

      if (type === 'practice_answer' && payload.correct === false) {
        const label = String(payload.errorCategory || 'okänd')
        increaseCount(errorCategoryCounts, label)
      }

      if (type === 'practice_session_end') {
        const durationSec = Number(payload.durationSec)
        if (Number.isFinite(durationSec) && durationSec >= 0) {
          sessionDurations.push(durationSec)
        }
      }
    }
  }

  return {
    avgEngagedSecondsPerActiveStudent,
    medianSessionDurationSeconds: median(sessionDurations, { positiveOnly: false }) || 0,
    breakTakeRate,
    ticketAccuracyToday,
    topLaunchModes: toTopEntries(launchCounts, 3),
    topErrorCategories: toTopEntries(errorCategoryCounts, 3)
  }
}
