import { describe, expect, it } from 'vitest'
import { candidatesForEvidence } from './index.js'
import { evidenceProblem } from '../../lib/evidenceProblem.js'

// Decimal tasks mixed into ordinary practice are saved with operation
// positions_decimal and the arithmetic operation in skill (found by the
// coverage report 2026-11-12: 342 wrong answers never reached the models).
const entry = (skill, a, b, studentAnswer, correctAnswer) => ({ source: 'practice',
  question: { domain: 'arithmetic', skill, operation: 'positions_decimal', problemType: 'add_dec_1dp_1dp_carry',
    promptText: `${a} ? ${b}`, values: { a, b } },
  answer: { status: 'incorrect', studentAnswer, correctAnswer } })

describe('decimal tasks in ordinary practice', () => {
  it('reach the models with the operation the pupil met', () => {
    const result = candidatesForEvidence(entry('addition', 2.3, 7.9, 9.2, 10.2))
    expect(result.status).toBe('matched')
    expect(result.scope).toBe('decimal_addition')
    expect(result.matches.map(match => match.modelId)).toContain('carry_forget')
    expect(candidatesForEvidence(entry('multiplication', 7, 6.7, 42.49, 46.9)).matches.map(m => m.modelId))
      .toContain('decimal_parts_multiplied_separately')
  })

  it('keep the same operation in the shared problem view', () => {
    expect(evidenceProblem(entry('subtraction', 9.1, 6.9, 3.8, 2.2)).type).toBe('subtraction')
  })
})
