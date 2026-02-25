import { evaluateAnswerQuality } from '../../../lib/answerQuality'
import { getSpeedTime, inferOperationFromProblemType } from '../../../lib/mathUtils'
import { getOperationLabel } from '../../../lib/operations'
import { getStartOfWeekTimestamp } from '../../../lib/studentProfile'
import { getStudentPresenceStatus } from '../../../lib/studentPresence'
import { summarizeTelemetryWindow } from '../../../lib/telemetry'
import {
  buildRiskSignals,
  summarizeAssignmentAdherence
} from './dashboardAssignmentRiskHelpers'
import {
  getInactiveDays,
  getProblemLevel,
  getRecordClassIds,
  getStartOfDayTimestamp,
  resolveClassNames
} from './dashboardCoreHelpers'
import { calculateTrend, toMinutes } from './dashboardSortUtils'
import { formatSkillTypeLabel } from './dashboardSkillLabelHelpers'
import { isKnowledgeError } from './dashboardTableStatusUtils'

export function buildStudentRow(student, activeAssignment = null, classNameById = new Map()) {
  const recentProblems = Array.isArray(student.recentProblems) ? student.recentProblems : []
  const classIds = getRecordClassIds(student)
  const classNames = resolveClassNames(classIds, classNameById, student.className || '')
  const classNameLabel = classNames.length > 0 ? classNames.join(', ') : ''
  const primaryClassName = classNames[0] || String(student.className || '')
  const attempts = recentProblems.length
  const correctCount = recentProblems.filter(problem => problem.correct).length
  const inattentionErrorCount = recentProblems.filter(
    problem => !problem.correct && String(problem.errorCategory || '') === 'inattention'
  ).length
  const successRate = attempts > 0 ? correctCount / attempts : 0

  const quality = recentProblems.map(problem => evaluateAnswerQuality(problem))
  const reasonableCount = quality.filter(item => item.isReasonable).length
  const reasonableRate = attempts > 0 ? reasonableCount / attempts : 0

  const wrongQuality = quality.filter((qualityItem, index) => {
    const problem = recentProblems[index]
    return !problem.correct && isKnowledgeError(problem)
  })
  const avgRelativeError = wrongQuality.length > 0
    ? wrongQuality.reduce((sum, item) => sum + item.relativeError, 0) / wrongQuality.length
    : null

  const trend = calculateTrend(recentProblems)
  const lastActive = recentProblems[recentProblems.length - 1]?.timestamp || null
  const inactiveDays = getInactiveDays(lastActive)

  const todayStart = getStartOfDayTimestamp()
  const todayProblems = recentProblems.filter(problem => problem.timestamp >= todayStart)
  const todayAttempts = todayProblems.length
  const todayCorrectCount = todayProblems.filter(problem => problem.correct).length
  const todayWrongCount = todayAttempts - todayCorrectCount
  const todayKnowledgeWrongCount = todayProblems.filter(problem => !problem.correct && isKnowledgeError(problem)).length
  const todayInattentionCount = todayProblems.filter(problem => problem.errorCategory === 'inattention').length
  const todaySuccessRate = todayAttempts > 0 ? todayCorrectCount / todayAttempts : 0
  const todayWrongReasonable = todayProblems
    .filter(problem => !problem.correct && isKnowledgeError(problem))
    .map(problem => evaluateAnswerQuality(problem))
    .filter(item => item.isReasonable)
    .length
  const todayAvgAnswerLength = getAverageAnswerLength(todayProblems)
  const todayByOperation = summarizeByOperation(todayProblems)
  const todayBySkill = summarizeBySkill(todayProblems)
  const todayOperationSummary = todayByOperation.length > 0
    ? todayByOperation.map(item => `${getOperationLabel(item.operation)}: ${item.attempts}`).join(' | ')
    : '-'
  const todayStruggle = getStruggleSkill(todayBySkill)
  const todayStruggleIndex = todayStruggle
    ? ((todayStruggle.wrong / Math.max(1, todayStruggle.attempts)) * 100) + todayStruggle.wrong
    : 0

  const weekStart = getStartOfWeekTimestamp()
  const weekProblems = recentProblems.filter(problem => problem.timestamp >= weekStart)
  const weekAttempts = weekProblems.length
  const weekCorrectCount = weekProblems.filter(problem => problem.correct).length
  const weekWrongCount = weekAttempts - weekCorrectCount
  const weekKnowledgeWrongCount = weekProblems.filter(problem => !problem.correct && isKnowledgeError(problem)).length
  const weekInattentionCount = weekProblems.filter(problem => problem.errorCategory === 'inattention').length
  const weekSuccessRate = weekAttempts > 0 ? weekCorrectCount / weekAttempts : 0
  const weekWrongReasonable = weekProblems
    .filter(problem => !problem.correct && isKnowledgeError(problem))
    .map(problem => evaluateAnswerQuality(problem))
    .filter(item => item.isReasonable)
    .length
  const weekSpeedTimes = weekProblems
    .map(problem => getSpeedTime(problem))
    .filter(value => Number.isFinite(value))
  const weekActiveTimeSec = weekSpeedTimes.reduce((sum, value) => sum + value, 0)
  const weekAvgTimePerProblemSec = weekSpeedTimes.length > 0
    ? weekActiveTimeSec / weekSpeedTimes.length
    : 0
  const weekAvgAnswerLength = getAverageAnswerLength(weekProblems)
  const weekByOperation = summarizeByOperation(weekProblems)
  const weekBySkill = summarizeBySkill(weekProblems)
  const weekOperationSummary = weekByOperation.length > 0
    ? weekByOperation.map(item => `${getOperationLabel(item.operation)}: ${item.attempts}`).join(' | ')
    : '-'
  const weekStruggle = getStruggleSkill(weekBySkill)
  const weekStruggleIndex = weekStruggle
    ? ((weekStruggle.wrong / Math.max(1, weekStruggle.attempts)) * 100) + weekStruggle.wrong
    : 0

  const todayAssignment = summarizeAssignmentAdherence(todayProblems, activeAssignment)
  const weekAssignment = summarizeAssignmentAdherence(weekProblems, activeAssignment)
  const overallAssignment = summarizeAssignmentAdherence(recentProblems, activeAssignment)
  const primaryOperation = (
    weekByOperation[0]?.operation
    || todayByOperation[0]?.operation
    || inferOperationFromProblemType(recentProblems[recentProblems.length - 1]?.problemType || '')
  )
  const focusOperation = todayByOperation[0]?.operation || primaryOperation || 'addition'
  const presenceStatus = getStudentPresenceStatus(student, {
    now: Date.now(),
    startToday: todayStart
  })
  const activeNow = presenceStatus.code === 'green'
  const telemetry = summarizeTelemetryWindow(student)
  const telemetryToday = telemetry.today || {}
  const telemetryWeek = telemetry.week || {}

  const riskSignals = buildRiskSignals({
    attempts,
    lastActive,
    inactiveDays,
    weekAttempts,
    weekWrongCount: weekKnowledgeWrongCount,
    weekSuccessRate,
    weekReasonableWrongCount: weekWrongReasonable,
    weekAvgTimePerProblemSec,
    weekAssignment,
    todayAttempts,
    todayWrongCount: todayKnowledgeWrongCount,
    todaySuccessRate,
    todayReasonableWrongCount: todayWrongReasonable,
    todayStruggle
  }, activeAssignment)

  return {
    studentId: student.studentId,
    name: student.name,
    classId: classIds[0] || '',
    classIds,
    className: primaryClassName,
    classNames,
    classNameLabel,
    currentDifficulty: Number(student.currentDifficulty) || 1,
    highestDifficulty: Number(student.highestDifficulty) || Number(student.currentDifficulty) || 1,
    operationAbilities: extractOperationAbilities(student),
    hasLoggedIn: Boolean(student.auth?.lastLoginAt),
    loginCount: Number(student.auth?.loginCount) || 0,
    attempts,
    correctCount,
    inattentionErrorCount,
    successRate,
    reasonableCount,
    reasonableRate,
    avgRelativeError,
    trend,
    lastActive,
    inactiveDays,
    primaryOperation,
    focusOperation,
    activeNow,
    activityStatus: presenceStatus.code,
    activityLabel: presenceStatus.label,
    presenceLastSeenAt: presenceStatus.lastPresenceAt || null,
    presenceLastInteractionAt: presenceStatus.lastInteractionAt || null,
    presenceInFocus: Boolean(presenceStatus.inFocus),
    presencePage: presenceStatus.page || '',
    telemetryEventCount: Array.isArray(student?.telemetry?.events) ? student.telemetry.events.length : 0,
    todayFocusMinutes: toMinutes(telemetryToday.focus_ms),
    todayEngagedMinutes: toMinutes(telemetryToday.engaged_ms),
    todayPresenceInteractions: Number(telemetryToday.interactions || 0),
    weekFocusMinutes: toMinutes(telemetryWeek.focus_ms),
    weekEngagedMinutes: toMinutes(telemetryWeek.engaged_ms),
    weekPresenceInteractions: Number(telemetryWeek.interactions || 0),
    todayPracticeLaunches: Number(telemetryToday.practice_launches || 0),
    todayPracticeAnswersTelemetry: Number(telemetryToday.practice_answers || 0),
    todayPracticeCorrectTelemetry: Number(telemetryToday.practice_correct || 0),
    todayPracticeWrongTelemetry: Number(telemetryToday.practice_wrong || 0),
    todayTicketSubmitted: Number(telemetryToday.ticket_submitted || 0),
    todayTicketCorrect: Number(telemetryToday.ticket_correct || 0),
    todayTicketWrong: Number(telemetryToday.ticket_wrong || 0),
    todayBreakPromptsShown: Number(telemetryToday.break_prompts_shown || 0),
    todayBreaksTaken: Number(telemetryToday.breaks_taken || 0),
    todayBreaksSkipped: Number(telemetryToday.breaks_skipped || 0),
    todayPracticeSessionsStarted: Number(telemetryToday.practice_sessions_started || 0),
    todayPracticeSessionsEnded: Number(telemetryToday.practice_sessions_ended || 0),
    activeToday: todayAttempts > 0,
    todayAttempts,
    todayCorrectCount,
    todayWrongCount,
    todayKnowledgeWrongCount,
    todayInattentionCount,
    todaySuccessRate,
    todayReasonableWrongCount: todayWrongReasonable,
    todayAvgAnswerLength,
    todayByOperation,
    todayBySkill,
    todayOperationSummary,
    todayStruggle,
    todayStruggleIndex,
    todayAssignmentAttempts: todayAssignment.attempts,
    todayAssignmentMatched: todayAssignment.matchedAttempts,
    todayAssignmentAdherenceRate: todayAssignment.rate,
    todayAssignmentMissedByOperation: todayAssignment.missedByOperation,
    todayAssignmentMissedByLevel: todayAssignment.missedByLevel,
    activeThisWeek: weekAttempts > 0,
    weekAttempts,
    weekCorrectCount,
    weekWrongCount,
    weekKnowledgeWrongCount,
    weekInattentionCount,
    weekSuccessRate,
    weekReasonableWrongCount: weekWrongReasonable,
    weekActiveTimeSec,
    weekAvgTimePerProblemSec,
    weekAvgAnswerLength,
    weekByOperation,
    weekBySkill,
    weekOperationSummary,
    weekStruggle,
    weekStruggleIndex,
    weekAssignmentAttempts: weekAssignment.attempts,
    weekAssignmentMatched: weekAssignment.matchedAttempts,
    weekAssignmentAdherenceRate: weekAssignment.rate,
    weekAssignmentMissedByOperation: weekAssignment.missedByOperation,
    weekAssignmentMissedByLevel: weekAssignment.missedByLevel,
    assignmentAttempts: overallAssignment.attempts,
    assignmentMatched: overallAssignment.matchedAttempts,
    assignmentAdherenceRate: overallAssignment.rate,
    riskLevel: riskSignals.riskLevel,
    riskScore: riskSignals.riskScore,
    riskCodes: riskSignals.riskCodes,
    supportScore: riskSignals.supportScore
  }
}

function extractOperationAbilities(student) {
  const abilities = student?.adaptive?.operationAbilities
  if (abilities && typeof abilities === 'object') {
    return {
      addition: Number(abilities.addition) || 1,
      subtraction: Number(abilities.subtraction) || 1,
      multiplication: Number(abilities.multiplication) || 1,
      division: Number(abilities.division) || 1
    }
  }
  const global = Number(student.currentDifficulty) || 1
  return {
    addition: global,
    subtraction: Math.max(1, global - 2),
    multiplication: Math.max(1, global - 3),
    division: Math.max(3, global - 4)
  }
}

function summarizeByOperation(problems) {
  const stats = new Map()

  for (const problem of problems) {
    const operation = inferOperationFromProblemType(problem.problemType)
    const prev = stats.get(operation) || {
      operation,
      attempts: 0,
      wrong: 0,
      answerLengthSum: 0
    }

    const answerLength = getAnswerLength(problem)
    prev.attempts += 1
    if (!problem.correct && isKnowledgeError(problem)) prev.wrong += 1
    prev.answerLengthSum += answerLength
    stats.set(operation, prev)
  }

  return Array.from(stats.values())
    .map(item => ({
      ...item,
      successRate: item.attempts > 0 ? (item.attempts - item.wrong) / item.attempts : 0,
      avgAnswerLength: item.attempts > 0 ? item.answerLengthSum / item.attempts : 0
    }))
    .sort((a, b) => b.attempts - a.attempts)
}

function getStruggleSkill(skillStats) {
  if (skillStats.length === 0) return null

  const best = [...skillStats].sort((a, b) => {
    if (a.wrong !== b.wrong) return b.wrong - a.wrong
    if (a.successRate !== b.successRate) return a.successRate - b.successRate
    return b.attempts - a.attempts
  })[0]

  if (!best || best.wrong === 0) return null
  return best
}

function summarizeBySkill(problems) {
  const stats = new Map()

  for (const problem of problems) {
    const operation = inferOperationFromProblemType(problem.problemType)
    const rawTag = problem.skillTag || problem.problemType || operation
    const skillKey = String(rawTag)
    const level = getProblemLevel(problem)
    const prev = stats.get(skillKey) || {
      operation,
      skillKey,
      skillLabel: formatSkillLabel(operation, skillKey),
      attempts: 0,
      wrong: 0,
      levelSum: 0,
      levelCount: 0
    }

    prev.attempts += 1
    if (!problem.correct && isKnowledgeError(problem)) prev.wrong += 1
    if (Number.isFinite(level)) {
      prev.levelSum += level
      prev.levelCount += 1
    }
    stats.set(skillKey, prev)
  }

  return Array.from(stats.values())
    .map(item => ({
      ...item,
      successRate: item.attempts > 0 ? (item.attempts - item.wrong) / item.attempts : 0,
      avgLevel: item.levelCount > 0 ? item.levelSum / item.levelCount : null
    }))
}

function formatSkillLabel(operation, skillKey) {
  const normalized = String(skillKey || '').trim()
  if (!normalized) return getOperationLabel(operation)

  const compact = formatSkillTypeLabel(normalized)
  if (compact && compact !== normalized) return compact
  return compact || getOperationLabel(operation)
}

function getAnswerLength(problem) {
  if (Number.isFinite(problem.answerLength)) return problem.answerLength
  if (problem.studentAnswer === null || problem.studentAnswer === undefined) return 0

  const normalized = String(problem.studentAnswer).replace('-', '').replace('.', '').trim()
  return normalized.length
}

function getAverageAnswerLength(problems) {
  if (problems.length === 0) return null
  const total = problems.reduce((sum, problem) => sum + getAnswerLength(problem), 0)
  return total / problems.length
}
