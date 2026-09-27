import { computeOperationMasteryBoards, getPreferredProblemSource } from '../../../lib/masteryCalculation'
import { isMasteryEligible, readEvidenceClaim } from '../../../lib/evidenceContract'
import { getOperationLabel } from '../../../lib/operations'
import { buildStudentDailyTrend } from '../../../lib/studentDailyTrend'
import { buildNcmDetailForStudent } from './dashboardStudentDetailNcmHelpers'
import { isKnowledgeError } from './dashboardTableStatusUtils'
import { ALL_OPERATIONS, LEVELS } from './dashboardConstants'

export function buildTeacherStudentViewData(student) {
  if (!student) return null
  const operationMasteryBoards = buildOperationMasteryBoardsForTeacher(student)
  const levelErrorRows = buildLevelErrorRowsForTeacher(student)
  const ncmDetail = buildNcmDetailForStudent(student)

  return {
    dailyTrend: buildStudentDailyTrend(student),
    operationMasteryBoards,
    levelErrorRows,
    ncmDetail
  }
}

function buildOperationMasteryBoardsForTeacher(student) {
  const problems = getPreferredProblemSource(student)
  return computeOperationMasteryBoards(problems, ALL_OPERATIONS, LEVELS)
}

function buildLevelErrorRowsForTeacher(student) {
  const source = getPreferredProblemSource(student)
  const grouped = new Map()

  for (const problem of source) {
    if (!isMasteryEligible(problem)) continue
    const claim = readEvidenceClaim(problem)
    const operation = claim.skill
    if (!ALL_OPERATIONS.includes(operation)) continue

    const level = claim.level
    if (!Number.isInteger(level) || level < 1 || level > 12) continue

    const key = `${operation}|${level}`
    const existing = grouped.get(key) || {
      operation,
      operationLabel: getOperationLabel(operation),
      level,
      attempts: 0,
      correct: 0,
      wrong: 0,
      knowledgeWrong: 0,
      inattentionWrong: 0
    }

    existing.attempts += 1
    if (problem?.correct) {
      existing.correct += 1
    } else {
      existing.wrong += 1
      if (isKnowledgeError(problem)) {
        existing.knowledgeWrong += 1
      } else {
        existing.inattentionWrong += 1
      }
    }

    grouped.set(key, existing)
  }

  return Array.from(grouped.values()).map(item => {
    const attempts = Number(item.attempts || 0)
    const correct = Number(item.correct || 0)
    const wrong = Number(item.wrong || 0)
    return {
      ...item,
      attempts,
      correct,
      wrong,
      successRate: attempts > 0 ? correct / attempts : 0,
      errorShare: attempts > 0 ? wrong / attempts : 0
    }
  })
}
