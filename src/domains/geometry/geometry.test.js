import { describe, expect, it } from 'vitest'
import { selectNextProblemForProfile } from '../../engine/adaptiveEngine.js'
import { addProblemResult, createStudentProfile } from '../../lib/studentProfile.js'
import { decodeAssignmentPayload, encodeAssignmentPayload } from '../../lib/assignments.js'
import { normalizeImageQuestion } from '../arithmetic/screeningImageQuestions.js'
import geometryDomain from './index.js'
import { encodeGeometrySelection, geometryQuestionById, geometryQuestions } from './questions.js'
import { findScreeningFigure } from '../arithmetic/screeningFigures.js'
import { countGeometryAssignmentAnswers, getGeometryLevel, isGeometryFinalLevelPassed } from './progress.js'
import { summarizeGeometry, summarizeGeometryProgress } from './statistics.js'

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

  it('keeps a controlled planar comparison in both levels and accepts the square as a rectangle', () => {
    const skill = 'geometry_plane'
    const stages = [
      ['square-contrast-angles', 'square-standard'],
      ['square-contrast-rotation', 'square-turned-same-size'],
      ['square-contrast-scale', 'square-small']
    ]
    for (const level of [1, 2]) {
      const history = [{ skill, values: { geometryTaskId: 'hexagon-image' } }]
      for (const [id, square] of stages) {
        const problem = geometryDomain.generate(skill, level, { recentGeometry: history })
        expect(problem.values.geometryTaskId).toBe(id)
        expect(problem.choiceTask.options.map(option => option.id).sort()).toEqual(['rhombus-equal-sides', square].sort())
        expect(problem.choiceTask.correctOptionIds).toEqual([square])
        expect(geometryDomain.verifyContent(problem).valid).toBe(true)
        history.push(problem)
      }
      const final = geometryDomain.generate(skill, level, { recentGeometry: history })
      expect(final.values).toMatchObject({ geometryTaskId: 'rectangle-contrast-square', geometryConcept: 'rectangle' })
      expect(final.choiceTask.options.filter(option => findScreeningFigure(option.image.id).tags.includes('rektangel'))
        .map(option => option.id).sort()).toEqual(['rectangle-standard', 'square-standard'])
      expect(geometryDomain.evaluate(final, 'rectangle-standard').correct).toBe(false)
      expect(geometryDomain.evaluate(final, encodeGeometrySelection(['rectangle-standard', 'square-standard'])).correct).toBe(true)
      expect(geometryDomain.verifyContent(final).valid).toBe(true)
    }
    expect(geometryQuestionById['rectangle-image']).toMatchObject({
      taskVersion: 1, correctOptionIds: ['rectangle-rotated', 'square-standard']
    })
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

  it('projects distinct geometry concepts and the newest ten unique practice answers across saved history', () => {
    const line = (timestamp, correct = true) => ({
      domain: 'geometry', skill: 'geometry_lines', observationId: 'line:' + timestamp, timestamp, correct,
      values: { geometryConcept: 'line' }
    })
    const legacy = { domain: 'geometry', problemId: 'legacy-ray', timestamp: 1, correct: false,
      values: { geometryTaskId: 'ray-image' } }
    const recent = { ...line(13, false), trainingContext: { assignmentId: 'geometry-assignment' } }
    const diagnostic = { ...line(14), evidenceClass: 'diagnostic_only', values: { geometryConcept: 'diagonal' } }
    const misplaced = { ...line(15), skill: 'geometry_plane', values: { geometryConcept: 'segment' } }
    const problems = Array.from({ length: 11 }, (_, i) => line(i + 2))
    const progress = summarizeGeometryProgress({
      problemLog: [legacy, ...problems],
      recentProblems: [{ ...legacy, observationId: 'legacy-ray:1' }, recent, ...problems.slice(-3), diagnostic, misplaced]
    })
    expect(progress).toEqual([
      { id: 'geometry_lines', label: 'Linjer och sträckor', tried: 2, total: 4, recentCount: 10, recentCorrect: 9 },
      { id: 'geometry_plane', label: 'Plana figurer', tried: 0, total: 11, recentCount: 0, recentCorrect: 0 },
      { id: 'geometry_solids', label: 'Kroppar (3D)', tried: 0, total: 6, recentCount: 0, recentCorrect: 0 }
    ])
    expect(summarizeGeometryProgress({ recentProblems: [legacy, { ...legacy, observationId: 'legacy-ray:1' }] })[0])
      .toMatchObject({ tried: 1, recentCount: 1, recentCorrect: 0 })
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
