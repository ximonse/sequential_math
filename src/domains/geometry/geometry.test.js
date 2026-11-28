import { describe, expect, it } from 'vitest'
import { selectNextProblemForProfile } from '../../engine/adaptiveEngine.js'
import { addProblemResult, createStudentProfile } from '../../lib/studentProfile.js'
import { decodeAssignmentPayload, encodeAssignmentPayload } from '../../lib/assignments.js'
import { normalizeImageQuestion } from '../arithmetic/screeningImageQuestions.js'
import geometryDomain from './index.js'
import { encodeGeometrySelection, geometryQuestions } from './questions.js'
import { countGeometryAssignmentAnswers, getGeometryLevel, isGeometryFinalLevelPassed } from './progress.js'
import { summarizeGeometry } from './statistics.js'

describe('geometry practice', () => {
  it('covers all 21 concepts with validated options', () => {
    const tasks = Object.values(geometryQuestions).flat()
    expect(new Set(tasks.map(task => task.concept)).size).toBe(21)
    for (const task of tasks) expect(normalizeImageQuestion(task).options.length).toBeGreaterThanOrEqual(2)
  })

  it('serves every question in each geometry round before repeating', () => {
    for (const [skill, tasks] of Object.entries(geometryQuestions)) {
      for (const level of [1, 2]) {
        const expected = tasks.filter(task => task.minimumLevel <= level).map(task => task.taskId)
        const recentGeometry = []
        for (const taskId of expected) {
          const problem = geometryDomain.generate(skill, level, { recentGeometry })
          expect(problem.values.geometryTaskId).toBe(taskId)
          expect(geometryDomain.verifyContent(problem).valid).toBe(true)
          recentGeometry.push(problem)
        }
        expect(geometryDomain.generate(skill, level, { recentGeometry }).values.geometryTaskId).toBe(expected[0])
      }
    }
  })

  it('retains exact selection evidence without mastery or speed credit', () => {
    const profile = createStudentProfile('GEOMETRY', 'Geometry test')
    const task = selectNextProblemForProfile(profile, { allowedTypes: ['geometry_plane'] })
    const [option] = task.choiceTask.correctOptionIds
    const { result, walEntries } = addProblemResult(profile, task, encodeGeometrySelection([option]), 7)
    expect(result).toMatchObject({ correct: false, errorCategory: 'unclassified', evidenceClass: 'practice_only',
      excludedFromSpeed: true, values: { geometryConcept: 'polygon', optionOrder: task.values.optionOrder } })
    expect(walEntries.map(entry => entry.type)).toEqual(['problem_result'])
  })

  it('advances on several quick correct answers and keeps slow correct answers correct', () => {
    const skill = 'geometry_lines'
    const profile = createStudentProfile('GEOMETRY', 'Geometry test')
    const thresholds = [4, 25, 5, 6]
    for (const time of thresholds) {
      const task = selectNextProblemForProfile(profile, { allowedTypes: [skill] })
      expect(task.level).toBe(1)
      expect(addProblemResult(profile, task, task.answer.correct, time).result.correct).toBe(true)
    }
    expect(getGeometryLevel(profile.problemLog, skill)).toBe(2)
    expect(getGeometryLevel(profile.problemLog.map(row => ({ ...row, timeSpent: 25 })), skill)).toBe(1)
    expect(getGeometryLevel(profile.problemLog.map(row => ({ ...row, interruptionSuspected: true })), skill)).toBe(1)
    expect(selectNextProblemForProfile(profile, { allowedTypes: [skill] }).choiceTask.responseMode).toBe('name')
  })

  it.each([
    ['geometry_lines', 4],
    ['geometry_plane', 6],
    ['geometry_solids', 6]
  ])('recognizes final-level completion for %s from distinct level 2 responses', (skill, needed) => {
    const finalTasks = geometryQuestions[skill].filter(task => task.minimumLevel === 2).slice(0, needed)
    const rows = finalTasks.map((task, index) => ({
      domain: 'geometry', skill, level: 2, correct: index > 0, timeSpent: 12,
      values: { geometryTaskId: task.taskId }
    }))
    expect(isGeometryFinalLevelPassed(rows.slice(0, -1), skill)).toBe(false)
    expect(isGeometryFinalLevelPassed(rows.map(row => ({ ...row, level: 1 })), skill)).toBe(false)
    expect(isGeometryFinalLevelPassed(rows.map(row => ({ ...row, interruptionSuspected: true })), skill)).toBe(false)
    expect(isGeometryFinalLevelPassed(rows.map(row => ({ ...row, timeSpent: 13 })), skill)).toBe(false)
    expect(isGeometryFinalLevelPassed(rows, skill)).toBe(true)
    expect(isGeometryFinalLevelPassed([...rows, ...rows.map(row => ({ ...row, correct: false }))], skill)).toBe(true)
  })

  it('keeps assignment selection and counts each scoped observation once', () => {
    const payload = { id: 'shapes', kind: 'standard', title: 'Geometri', minLevel: 1, maxLevel: 2, targetCount: 4,
      problemTypes: ['geometry_lines'], createdAt: 1 }
    expect(decodeAssignmentPayload(encodeAssignmentPayload(payload)).problemTypes).toEqual(payload.problemTypes)
    const answer = { domain: 'geometry', observationId: 'answer', timestamp: 100, correct: false,
      classIdAtAttempt: 'class', values: { geometryConcept: 'line' }, trainingContext: { assignmentId: payload.id } }
    const answers = [answer, answer, { ...answer, observationId: 'old', timestamp: 25, classIdAtAttempt: 'other' }]
    expect(countGeometryAssignmentAnswers({ recentProblems: answers }, payload, 50)).toBe(1)
    expect(summarizeGeometry([{ recentProblems: answers }], ['class'])).toEqual([{ concept: 'line', label: 'Linje', answers: 1, wrong: 1 }])
  })
})
