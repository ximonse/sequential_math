import { getOperationLabel } from '../../../lib/operations'

const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function calculateTrend(problems) {
  if (problems.length < 15) return null

  const last10 = problems.slice(-10)
  const previous10 = problems.slice(-20, -10)
  if (previous10.length < 5) return null

  const lastRate = last10.filter(p => p.correct).length / last10.length
  const prevRate = previous10.filter(p => p.correct).length / previous10.length
  return lastRate - prevRate
}

export function getSortedRows(rows, sortBy, sortDir) {
  const sorted = [...rows].sort((a, b) => compareRows(a, b, sortBy))
  return sortDir === 'asc' ? sorted : sorted.reverse()
}

export function getSortedSupportRows(rows, sortBy, sortDir) {
  const sorted = [...rows].sort((a, b) => compareSupportRows(a, b, sortBy))
  return sortDir === 'asc' ? sorted : sorted.reverse()
}

export function compareSupportRows(a, b, sortBy) {
  if (sortBy === 'name') return compareClassNameAndName(a, b)
  if (sortBy === 'class') {
    return String(a.classNameLabel || a.className || '').localeCompare(
      String(b.classNameLabel || b.className || ''),
      'sv'
    )
  }
  if (sortBy === 'activity') return getClassOverviewActivityRank(a.activityStatus) - getClassOverviewActivityRank(b.activityStatus)
  if (sortBy === 'risk') return Number(a.riskScore || 0) - Number(b.riskScore || 0)
  if (sortBy === 'support_score') return Number(a.supportScore || 0) - Number(b.supportScore || 0)
  if (sortBy === 'today_attempts') return Number(a.todayAttempts || 0) - Number(b.todayAttempts || 0)
  if (sortBy === 'today_wrong') return Number(a.todayWrongCount || 0) - Number(b.todayWrongCount || 0)
  if (sortBy === 'week_success') return Number(a.weekSuccessRate || 0) - Number(b.weekSuccessRate || 0)
  if (sortBy === 'struggle') {
    return String(a.todayStruggle?.skillLabel || '').localeCompare(String(b.todayStruggle?.skillLabel || ''), 'sv')
  }
  return Number(a.supportScore || 0) - Number(b.supportScore || 0)
}

export function getDefaultSupportSortDir(sortBy) {
  if (sortBy === 'name' || sortBy === 'class' || sortBy === 'struggle') return 'asc'
  return 'desc'
}

export function getSortedDetailLevelErrorRows(rows, sortBy, sortDir) {
  const sorted = [...rows].sort((a, b) => compareDetailLevelErrorRows(a, b, sortBy))
  return sortDir === 'asc' ? sorted : sorted.reverse()
}

export function compareDetailLevelErrorRows(a, b, sortBy) {
  let diff = 0
  if (sortBy === 'operation') diff = String(a.operationLabel || '').localeCompare(String(b.operationLabel || ''), 'sv')
  else if (sortBy === 'level') diff = Number(a.level || 0) - Number(b.level || 0)
  else if (sortBy === 'attempts') diff = Number(a.attempts || 0) - Number(b.attempts || 0)
  else if (sortBy === 'correct') diff = Number(a.correct || 0) - Number(b.correct || 0)
  else if (sortBy === 'wrong') diff = Number(a.wrong || 0) - Number(b.wrong || 0)
  else if (sortBy === 'knowledge_wrong') diff = Number(a.knowledgeWrong || 0) - Number(b.knowledgeWrong || 0)
  else if (sortBy === 'inattention_wrong') diff = Number(a.inattentionWrong || 0) - Number(b.inattentionWrong || 0)
  else if (sortBy === 'success_rate') diff = Number(a.successRate || 0) - Number(b.successRate || 0)
  else diff = Number(a.errorShare || 0) - Number(b.errorShare || 0)

  if (diff !== 0) return diff
  const operationDiff = String(a.operationLabel || '').localeCompare(String(b.operationLabel || ''), 'sv')
  if (operationDiff !== 0) return operationDiff
  return Number(a.level || 0) - Number(b.level || 0)
}

export function getDefaultDetailLevelErrorSortDir(sortBy) {
  if (sortBy === 'operation' || sortBy === 'level') return 'asc'
  return 'desc'
}

export function getSortedClassOverviewRows(rows, sortBy, sortDir) {
  const sorted = [...rows].sort((a, b) => compareClassOverviewRows(a, b, sortBy))
  return sortDir === 'asc' ? sorted : sorted.reverse()
}

export function compareClassOverviewRows(a, b, sortBy) {
  if (sortBy === 'name') return compareClassNameAndName(a, b)
  if (sortBy === 'activity') return getClassOverviewActivityRank(a.activityStatus) - getClassOverviewActivityRank(b.activityStatus)
  if (sortBy === 'operation') {
    return String(getOperationLabel(a.focusOperation || ''))
      .localeCompare(String(getOperationLabel(b.focusOperation || '')), 'sv')
  }
  if (sortBy === 'today_attempts') return Number(a.todayAttempts || 0) - Number(b.todayAttempts || 0)
  if (sortBy === 'today_wrong') return Number(a.todayWrongCount || 0) - Number(b.todayWrongCount || 0)
  if (sortBy === 'today_success') return Number(a.todaySuccessRate || 0) - Number(b.todaySuccessRate || 0)
  if (sortBy === 'today_engaged') return Number(a.todayEngagedMinutes || 0) - Number(b.todayEngagedMinutes || 0)
  if (sortBy === 'last_active') return Number(a.lastActive || 0) - Number(b.lastActive || 0)
  return compareClassNameAndName(a, b)
}

export function compareClassNameAndName(a, b) {
  const classCompare = String(a.classNameLabel || a.className || '').localeCompare(
    String(b.classNameLabel || b.className || ''),
    'sv'
  )
  if (classCompare !== 0) return classCompare
  return String(a.name || '').localeCompare(String(b.name || ''), 'sv')
}

export function getClassOverviewActivityRank(code) {
  if (code === 'green') return 4
  if (code === 'orange') return 3
  if (code === 'black') return 2
  if (code === 'red') return 1
  return 0
}

export function getDefaultClassOverviewSortDir(sortBy) {
  if (sortBy === 'name' || sortBy === 'operation') return 'asc'
  return 'desc'
}

export function getSortedTableStickyRows(rows, sortBy, sortDir) {
  const sorted = [...rows].sort((a, b) => compareTableStickyRows(a, b, sortBy))
  return sortDir === 'asc' ? sorted : sorted.reverse()
}

export function compareTableStickyRows(a, b, sortBy) {
  if (sortBy === 'name') return compareClassNameAndName(a, b)
  if (sortBy === 'class') return String(a.className || '').localeCompare(String(b.className || ''), 'sv')
  if (sortBy === 'today_done') return Number(a.todayDoneCount || 0) - Number(b.todayDoneCount || 0)
  if (sortBy === 'week_done') return Number(a.weekDoneCount || 0) - Number(b.weekDoneCount || 0)
  if (sortBy === 'star_count') return Number(a.starCount || 0) - Number(b.starCount || 0)
  if (String(sortBy).startsWith('table_')) {
    const table = Number(String(sortBy).slice(6))
    if (Number.isInteger(table) && TABLES.includes(table)) {
      return getStickyStatusRank(a.statusByTable?.[table]) - getStickyStatusRank(b.statusByTable?.[table])
    }
  }
  return compareClassNameAndName(a, b)
}

export function getStickyStatusRank(status) {
  if (status === 'star') return 3
  if (status === 'today') return 2
  if (status === 'week') return 1
  return 0
}

export function getDefaultStickySortDir(sortBy) {
  if (sortBy === 'name' || sortBy === 'class') return 'asc'
  return 'desc'
}

export function getDefaultResultSortDir(sortBy) {
  if (sortBy === 'name' || sortBy === 'student_id' || sortBy === 'class') return 'asc'
  return 'desc'
}

export function compareRows(a, b, sortBy) {
  if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'sv')
  if (sortBy === 'student_id') return String(a.studentId || '').localeCompare(String(b.studentId || ''), 'sv')
  if (sortBy === 'class') return compareClassNameAndName(a, b)
  if (sortBy === 'active_today') {
    if (a.activeToday !== b.activeToday) return Number(a.activeToday) - Number(b.activeToday)
    return (a.lastActive || 0) - (b.lastActive || 0)
  }

  if (sortBy === 'today_attempts') return a.todayAttempts - b.todayAttempts
  if (sortBy === 'today_wrong') return a.todayWrongCount - b.todayWrongCount
  if (sortBy === 'today_success_rate') return (a.todaySuccessRate || 0) - (b.todaySuccessRate || 0)
  if (sortBy === 'today_struggle') return a.todayStruggleIndex - b.todayStruggleIndex
  if (sortBy === 'today_engaged') return (a.todayEngagedMinutes || 0) - (b.todayEngagedMinutes || 0)
  if (sortBy === 'today_answer_length') return (a.todayAvgAnswerLength || 0) - (b.todayAvgAnswerLength || 0)
  if (sortBy === 'active_week') {
    if (a.activeThisWeek !== b.activeThisWeek) return Number(a.activeThisWeek) - Number(b.activeThisWeek)
    return (a.lastActive || 0) - (b.lastActive || 0)
  }
  if (sortBy === 'week_attempts') return a.weekAttempts - b.weekAttempts
  if (sortBy === 'week_correct') return a.weekCorrectCount - b.weekCorrectCount
  if (sortBy === 'week_wrong') return a.weekWrongCount - b.weekWrongCount
  if (sortBy === 'week_struggle') return (a.weekStruggleIndex || 0) - (b.weekStruggleIndex || 0)
  if (sortBy === 'week_active_time') return a.weekActiveTimeSec - b.weekActiveTimeSec
  if (sortBy === 'week_engaged') return (a.weekEngagedMinutes || 0) - (b.weekEngagedMinutes || 0)
  if (sortBy === 'week_success_rate') return a.weekSuccessRate - b.weekSuccessRate
  if (sortBy === 'week_answer_length') return (a.weekAvgAnswerLength || 0) - (b.weekAvgAnswerLength || 0)
  if (sortBy === 'assignment_week') return (a.weekAssignmentAdherenceRate ?? -1) - (b.weekAssignmentAdherenceRate ?? -1)
  if (sortBy === 'support_score') return (a.supportScore || 0) - (b.supportScore || 0)
  if (sortBy === 'risk_score') return (a.riskScore || 0) - (b.riskScore || 0)
  if (sortBy === 'logged_in') return Number(a.hasLoggedIn) - Number(b.hasLoggedIn)
  if (sortBy === 'last_active') return (a.lastActive || 0) - (b.lastActive || 0)
  if (sortBy === 'attempts') return a.attempts - b.attempts
  if (sortBy === 'success_rate') return a.successRate - b.successRate
  if (sortBy === 'reasonable_rate') return (a.reasonableRate || 0) - (b.reasonableRate || 0)
  if (sortBy === 'avg_relative_error') return (a.avgRelativeError ?? -1) - (b.avgRelativeError ?? -1)
  if (sortBy === 'trend') return (a.trend ?? -Infinity) - (b.trend ?? -Infinity)

  return (a.lastActive || 0) - (b.lastActive || 0)
}

export function toPercent(rate) {
  const numeric = Number(rate)
  if (!Number.isFinite(numeric)) return '-'
  return `${Math.round(numeric * 100)}%`
}

export function clampUnit(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(1, numeric))
}

export function increaseCount(map, key, step = 1) {
  const label = String(key || '').trim()
  if (!label) return
  map.set(label, Number(map.get(label) || 0) + step)
}

export function toTopEntries(map, limit = 3) {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count: Number(count || 0) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function toFixedOrEmpty(value, digits = 2) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return ''
  return numeric.toFixed(digits)
}

export function getSuccessColorClass(rate) {
  if (rate >= 0.8) return 'text-green-600 font-semibold'
  if (rate >= 0.6) return 'text-yellow-700 font-semibold'
  return 'text-red-600 font-semibold'
}

export function getReasonableColorClass(rate) {
  if (rate >= 0.9) return 'text-green-600 font-semibold'
  if (rate >= 0.75) return 'text-yellow-700 font-semibold'
  return 'text-red-600 font-semibold'
}

export function getErrorShareColorClass(rate) {
  if (rate >= 0.4) return 'text-red-700'
  if (rate >= 0.25) return 'text-amber-700'
  return 'text-green-700'
}

export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Aldrig'

  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just nu'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min sedan`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} tim sedan`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} dagar sedan`
  return new Date(timestamp).toLocaleDateString('sv-SE')
}

export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds || 0))
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

export function toMinutes(milliseconds) {
  const value = Number(milliseconds)
  if (!Number.isFinite(value) || value <= 0) return 0
  return value / 60000
}
