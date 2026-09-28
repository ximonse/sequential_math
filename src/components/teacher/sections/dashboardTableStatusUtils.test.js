import { describe, expect, it } from 'vitest'
import {
  computeStickyTableCompletionMapForTeacher,
  computeStickyTableProgressForTeacher,
  getCompactMasteryConcern,
  getCompactMasteryStatus,
  getCompactMasteryColorClass
} from './dashboardTableStatusUtils'
import { computeOperationMasteryBoards } from '../../../lib/masteryCalculation'

describe('table sticky status', () => {
  it('keeps mixed-practice table attempts visible before the completion threshold', () => {
    const start = Date.now() - 60_000
    const source = [
      { timestamp: Date.now() - 30_000, problemType: 'mul_1d_1d_easy', values: { a: 6, b: 4 }, correct: true },
      { timestamp: Date.now() - 20_000, problemType: 'mul_1d_1d_easy', values: { a: 6, b: 7 }, correct: false },
      { timestamp: Date.now() - 10_000, problemType: 'mul_1d_1d_easy', values: { a: 6, b: 8 }, correct: true }
    ]

    const progress = computeStickyTableProgressForTeacher(source, start)
    const complete = computeStickyTableCompletionMapForTeacher(source, start)

    expect(progress[6]).toMatchObject({ attempts: 3, correct: 2, reached: false })
    expect(complete[6]).toBe(false)
  })

  it('marks a mixed-practice table as reached at ten attempts and 80 percent correct', () => {
    const start = Date.now() - 60_000
    const source = Array.from({ length: 10 }, (_, index) => ({
      timestamp: Date.now() - (50_000 - index * 1_000),
      problemType: 'mul_1d_1d_easy',
      values: { a: 7, b: (index % 9) + 1 },
      correct: index < 8
    }))

    expect(computeStickyTableProgressForTeacher(source, start)[7]).toMatchObject({
      attempts: 10,
      correct: 8,
      reached: true
    })
  })
})

function masteryAnswer(index, timestamp, correct = true) {
  return {
    observationId: `mastery-${index}`, problemId: `mastery-${index}`,
    operation: 'addition', skill: 'addition', level: 1,
    evidenceSkill: 'addition', evidenceLevel: 1,
    evidenceClass: 'mastery_eligible', evidenceRuleVersion: 1,
    correct, timestamp: timestamp + index
  }
}

function firstCell(problems, profile) {
  const [board] = computeOperationMasteryBoards(problems, ['addition'], [1], { profile })
  return [board.historical[0], board.weekly[0], board.monthly[0]]
}

describe('teacher mastery colors', () => {
  it('never marks a single correct answer as attained', () => {
    const cell = firstCell([masteryAnswer(1, Date.now() - 1000)])
    expect(getCompactMasteryStatus(...cell)).toBe('started')
    expect(getCompactMasteryColorClass(...cell)).toContain('bg-blue-200')
    expect(getCompactMasteryStatus(...firstCell([
      { ...masteryAnswer(2, Date.now() - 1000), evidenceClass: 'practice_only' }
    ]))).toBe('empty')
  })

  it('distinguishes attained this week from attained during the past month', () => {
    const week = firstCell(Array.from({ length: 5 }, (_, index) => masteryAnswer(index, Date.now() - 60_000)))
    const month = firstCell(Array.from({ length: 5 }, (_, index) => masteryAnswer(index, Date.now() - 14 * 86400_000)))
    expect(getCompactMasteryStatus(...week)).toBe('mastered_week')
    expect(getCompactMasteryStatus(...month)).toBe('mastered_month')
  })

  it('preserves canonical historical mastery after a temporary dip', () => {
    const old = Date.now() - 60 * 86400_000
    const answers = Array.from({ length: 30 }, (_, index) => masteryAnswer(index, old, index < 27))
    const cell = firstCell(answers)
    expect(cell[0]).toMatchObject({ status: 'mastered', masteryAttempts: 15, masteryCorrect: 12 })
    expect(getCompactMasteryStatus(...cell)).toBe('mastered_older')
  })

  it('respects a referenced mastery fact even when older answers are no longer stored', () => {
    const profile = { masteryFacts: { facts: [{
      id: 'addition:1:fact', operation: 'addition', level: 1,
      achievedAt: Date.now() - 60 * 86400_000, ruleVersion: 1,
      evidenceObservationIds: ['older-answer']
    }], revokedIds: [] } }
    expect(getCompactMasteryStatus(...firstCell([], profile))).toBe('mastered_older')
    profile.masteryFacts.revokedIds.push('addition:1:fact')
    expect(getCompactMasteryStatus(...firstCell([], profile))).toBe('empty')
  })

  it('keeps historical attainment visible while flagging newer errors separately', () => {
    const old = Date.now() - 60 * 86400_000
    const answers = [
      ...Array.from({ length: 5 }, (_, index) => masteryAnswer(index, old)),
      ...Array.from({ length: 6 }, (_, index) => masteryAnswer(index + 5, Date.now() - 60_000, false))
    ]
    const cell = firstCell(answers, { masteryFacts: { facts: [{
      id: 'addition:1:fact', operation: 'addition', level: 1,
      achievedAt: old, ruleVersion: 1, evidenceObservationIds: ['mastery-1']
    }], revokedIds: [] } })
    expect(getCompactMasteryStatus(...cell)).toBe('mastered_older')
    expect(getCompactMasteryConcern(cell[0])).toBe('many_errors')
  })

  it('uses enough evidence before showing difficulty or many errors', () => {
    const old = Date.now() - 60 * 86400_000
    const orange = firstCell(Array.from({ length: 5 }, (_, index) => masteryAnswer(index, old, index < 3)))
    const red = firstCell(Array.from({ length: 5 }, (_, index) => masteryAnswer(index, old, index < 2)))
    expect(getCompactMasteryStatus(...orange)).toBe('difficult')
    expect(getCompactMasteryStatus(...red)).toBe('struggling')
  })
})
