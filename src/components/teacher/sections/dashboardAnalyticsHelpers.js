import { getStartOfWeekTimestamp } from '../../../lib/studentProfile'
import {
  getNcmDomainLabelSv,
  getNcmSkillMappingFromProblem
} from '../../../lib/ncmSkillMap'
import { compareClassNameAndName } from './dashboardSortUtils'
import { getPreferredProblemSource } from '../../../lib/masteryCalculation'
import { getCurrentWeekTeacherEvidence } from '../../../lib/teacherSummary'
import {
  isKnowledgeError
} from './dashboardTableStatusUtils'
import {
  getRecordClassLabel,
  getStartOfDayTimestamp,
  recordMatchesClassFilter
} from './dashboardCoreHelpers'

const NCM_DOMAIN_MIN_ATTEMPTS = 2
const DAY_MS = 24 * 60 * 60 * 1000

export function buildInactivityBuckets(rows) {
  const todayStart = getStartOfDayTimestamp()
  const now = Date.now()
  const counts = {
    notActiveToday: 0,
    twoDaysOrMore: 0,
    sevenDaysOrMore: 0,
    neverStarted: 0
  }

  for (const row of rows) {
    const neverStarted = (row.attempts || 0) === 0
    const age = row.lastActive ? now - row.lastActive : Infinity

    if (neverStarted) {
      counts.neverStarted += 1
    } else if (age >= 7 * DAY_MS) {
      counts.sevenDaysOrMore += 1
    } else if (age >= 2 * DAY_MS) {
      counts.twoDaysOrMore += 1
    } else if (!row.lastActive || row.lastActive < todayStart) {
      counts.notActiveToday += 1
    }
  }

  return counts
}

export function buildClassSummaries(classes, students, selectedClassIds, weekGoal) {
  const selected = new Set(selectedClassIds || [])
  const visibleClasses = selected.size > 0
    ? classes.filter(item => selected.has(item.id))
    : classes
  const weekStart = getStartOfWeekTimestamp()

  return visibleClasses.map(item => {
    const classStudents = students.filter(student => recordMatchesClassFilter(student, [item.id]))
    const studentCount = classStudents.length
    let startedCount = 0
    let weeklyActiveCount = 0
    let weeklyGoalReachedCount = 0

    for (const student of classStudents) {
      const problems = Array.isArray(student.recentProblems) ? student.recentProblems : []
      const sourceAttempts = Number(student?.teacherSummary?.evidence?.sourceAttempts) || 0
      const lifetimeAttempts = Number(student?.stats?.lifetimeProblems || student?.stats?.totalProblems) || 0
      if (sourceAttempts > 0 || lifetimeAttempts > 0 || problems.length > 0) startedCount += 1
      const weekEvidence = getCurrentWeekTeacherEvidence(student, weekStart)
      const weekAttempts = weekEvidence?.attempts
        ?? problems.filter(problem => problem.timestamp >= weekStart).length
      if (weekAttempts > 0) weeklyActiveCount += 1
      if (weekAttempts >= weekGoal) weeklyGoalReachedCount += 1
    }

    return {
      classId: item.id,
      className: item.name,
      studentCount,
      startedCount,
      notStartedCount: Math.max(0, studentCount - startedCount),
      weeklyActiveCount,
      weeklyGoalReachedCount,
      weeklyGoalReachedRate: studentCount > 0 ? weeklyGoalReachedCount / studentCount : 0
    }
  }).sort((a, b) => a.className.localeCompare(b.className, 'sv'))
}

export function buildNcmOverview(students, classNameById = new Map()) {
  const safeStudents = Array.isArray(students) ? students : []
  const weekStart = getStartOfWeekTimestamp()

  const domainAggregate = new Map()
  const rows = []
  let totalAttemptsWeek = 0
  let studentsWithAttemptsWeek = 0

  for (const student of safeStudents) {
    const problemSource = getPreferredProblemSource(student)
    const weekProblems = (Array.isArray(problemSource) ? problemSource : [])
      .filter(problem => Number(problem?.timestamp || 0) >= weekStart)

    const domainStats = new Map()
    let weekAttempts = 0
    let weekCorrect = 0
    let weekKnowledgeWrong = 0
    let weekInattentionWrong = 0
    let lastNcmCode = ''
    let lastNcmTs = 0

    for (const problem of weekProblems) {
      const mapping = getNcmSkillMappingFromProblem(problem?.problemType, problem?.skillTag)
      const ncmCode = String(mapping?.code || '').trim()
      if (!ncmCode) continue

      const domainTag = String(mapping?.domainTag || 'unknown')
      const ts = Number(problem?.timestamp || 0)
      weekAttempts += 1
      totalAttemptsWeek += 1
      if (problem?.correct) weekCorrect += 1
      if (!problem?.correct && isKnowledgeError(problem)) weekKnowledgeWrong += 1
      if (!problem?.correct && String(problem?.errorCategory || '') === 'inattention') weekInattentionWrong += 1
      if (ts >= lastNcmTs) {
        lastNcmTs = ts
        lastNcmCode = ncmCode
      }

      const entry = domainStats.get(domainTag) || {
        domainTag,
        attempts: 0,
        correct: 0,
        knowledgeWrong: 0
      }
      entry.attempts += 1
      if (problem?.correct) entry.correct += 1
      if (!problem?.correct && isKnowledgeError(problem)) entry.knowledgeWrong += 1
      domainStats.set(domainTag, entry)

      const aggregateEntry = domainAggregate.get(domainTag) || {
        domainTag,
        attempts: 0,
        correct: 0,
        knowledgeWrong: 0
      }
      aggregateEntry.attempts += 1
      if (problem?.correct) aggregateEntry.correct += 1
      if (!problem?.correct && isKnowledgeError(problem)) aggregateEntry.knowledgeWrong += 1
      domainAggregate.set(domainTag, aggregateEntry)
    }

    if (weekAttempts > 0) studentsWithAttemptsWeek += 1

    const domainList = Array.from(domainStats.values()).map(item => ({
      ...item,
      successRate: item.attempts > 0 ? item.correct / item.attempts : 0,
      knowledgeWrongRate: item.attempts > 0 ? item.knowledgeWrong / item.attempts : 0
    }))
    const weakestDomain = pickWeakestNcmDomain(domainList)
    const strongestDomain = pickStrongestNcmDomain(domainList)

    rows.push({
      studentId: String(student?.studentId || ''),
      name: String(student?.name || ''),
      className: getRecordClassLabel(student, classNameById),
      weekAttempts,
      weekSuccessRate: weekAttempts > 0 ? weekCorrect / weekAttempts : null,
      weekKnowledgeWrong,
      weekInattentionWrong,
      weakestDomainLabel: weakestDomain ? getNcmDomainLabelSv(weakestDomain.domainTag) : '-',
      strongestDomainLabel: strongestDomain ? getNcmDomainLabelSv(strongestDomain.domainTag) : '-',
      lastNcmCode
    })
  }

  rows.sort((a, b) => {
    if (a.weekAttempts !== b.weekAttempts) return b.weekAttempts - a.weekAttempts
    if ((a.weekSuccessRate ?? -1) !== (b.weekSuccessRate ?? -1)) return (a.weekSuccessRate ?? -1) - (b.weekSuccessRate ?? -1)
    return compareClassNameAndName(a, b)
  })

  const domainOverview = Array.from(domainAggregate.values()).map(item => ({
    ...item,
    successRate: item.attempts > 0 ? item.correct / item.attempts : 0,
    knowledgeWrongRate: item.attempts > 0 ? item.knowledgeWrong / item.attempts : 0
  }))
  const weakestDomain = pickWeakestNcmDomain(domainOverview)
  const strongestDomain = pickStrongestNcmDomain(domainOverview)

  return {
    rows,
    totalAttemptsWeek,
    studentsWithAttemptsWeek,
    weakestDomainLabel: weakestDomain ? getNcmDomainLabelSv(weakestDomain.domainTag) : '-',
    strongestDomainLabel: strongestDomain ? getNcmDomainLabelSv(strongestDomain.domainTag) : '-'
  }
}

export function pickWeakestNcmDomain(domains) {
  const eligible = (Array.isArray(domains) ? domains : [])
    .filter(item => Number(item?.attempts || 0) >= NCM_DOMAIN_MIN_ATTEMPTS && Number(item?.knowledgeWrong || 0) > 0)
    .sort((a, b) => {
      if (Number(a.knowledgeWrong || 0) !== Number(b.knowledgeWrong || 0)) {
        return Number(b.knowledgeWrong || 0) - Number(a.knowledgeWrong || 0)
      }
      if (Number(a.knowledgeWrongRate || 0) !== Number(b.knowledgeWrongRate || 0)) {
        return Number(b.knowledgeWrongRate || 0) - Number(a.knowledgeWrongRate || 0)
      }
      return Number(b.attempts || 0) - Number(a.attempts || 0)
    })

  return eligible[0] || null
}

export function pickStrongestNcmDomain(domains) {
  const eligible = (Array.isArray(domains) ? domains : [])
    .filter(item => Number(item?.attempts || 0) >= NCM_DOMAIN_MIN_ATTEMPTS)
    .sort((a, b) => {
      if (Number(a.successRate || 0) !== Number(b.successRate || 0)) {
        return Number(b.successRate || 0) - Number(a.successRate || 0)
      }
      if (Number(a.correct || 0) !== Number(b.correct || 0)) {
        return Number(b.correct || 0) - Number(a.correct || 0)
      }
      return Number(b.attempts || 0) - Number(a.attempts || 0)
    })

  return eligible[0] || null
}
