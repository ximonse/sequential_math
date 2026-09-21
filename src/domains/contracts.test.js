import { describe, expect, it } from 'vitest'
import { analyzeStudentError, createProblemForSelection, evaluateStudentAnswer } from '../engine/adaptiveEngine'
import { listDomains } from './registry'
import { generateWithProblemGuardian } from './contracts'
import { attachEvidenceClaim, EVIDENCE_CLASSES } from '../lib/evidenceContract'
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

  it('generates, evaluates and analyzes every registered skill level', () => {
    for (const domain of listDomains()) {
      for (const skill of domain.skills) {
        const [min, max] = skill.levels
        const levels = Array.from({ length: max - min + 1 }, (_, index) => min + index)

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

  it('retries an invalid candidate and returns only a displayable matching problem', () => {
    let attempts = 0
    const valid = createProblemForSelection({ domain: 'arithmetic', skill: 'addition', level: 2 })
    const problem = generateWithProblemGuardian(() => {
      attempts += 1
      return attempts === 1
        ? attachEvidenceClaim(valid, { class: EVIDENCE_CLASSES.INVALID })
        : valid
    }, { domain: 'arithmetic', skill: 'addition', level: 2 })

    expect(attempts).toBe(2)
    expect(problem).toBe(valid)
  })

  it('stops after bounded retries when generated content keeps breaking the contract', () => {
    let attempts = 0
    const wrongLevel = createProblemForSelection({ domain: 'percentage', skill: 'percentage', level: 1 })

    expect(() => generateWithProblemGuardian(() => {
      attempts += 1
      return wrongLevel
    }, { domain: 'percentage', skill: 'percentage', level: 7 }, 3)).toThrow(
      'Problem guardian rejected 3 candidates'
    )
    expect(attempts).toBe(3)
  })
})
