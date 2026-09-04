import { describe, expect, it } from 'vitest'
import { analyzeStudentError, createProblemForSelection, evaluateStudentAnswer } from '../engine/adaptiveEngine'
import { listDomains } from './registry'
import { ALL_OPERATIONS } from '../lib/operations'

function correctAnswerFor(problem) {
  if (problem.answer.correct !== undefined) return problem.answer.correct
  if (problem.answer.value !== undefined) return problem.answer.value
  if (problem.answer.num !== undefined && problem.answer.den !== undefined) {
    return `${problem.answer.num}/${problem.answer.den}`
  }
  throw new Error('Generated problem has no correct answer')
}

describe('domain contracts', () => {
  it('covers every operation with exactly one registered skill', () => {
    const skills = listDomains().flatMap(domain => domain.skills.map(skill => skill.id))
    expect([...skills].sort()).toEqual([...ALL_OPERATIONS].sort())
    expect(new Set(skills).size).toBe(skills.length)
  })

  it('generates, evaluates and analyzes every skill at its boundary levels', () => {
    for (const domain of listDomains()) {
      for (const skill of domain.skills) {
        const [min, max] = skill.levels
        const levels = [...new Set([min, Math.round((min + max) / 2), max])]

        for (const level of levels) {
          const problem = createProblemForSelection({
            domain: domain.id,
            skill: skill.id,
            level
          })
          const correctAnswer = correctAnswerFor(problem)
          const evaluation = evaluateStudentAnswer(problem, correctAnswer)
          const analysis = analyzeStudentError(problem, correctAnswer)

          expect(evaluation.correct, `${domain.id}/${skill.id}/${level}`).toBe(true)
          expect(analysis.category).toBe('none')
        }
      }
    }
  })

  it('rejects duplicate domain registrations through the live registry', () => {
    const ids = listDomains().map(domain => domain.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
