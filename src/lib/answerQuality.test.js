import { describe, expect, it } from 'vitest'
import { evaluateAnswerQuality } from './answerQuality'

describe('evaluateAnswerQuality', () => {
  it('reuses precomputed stored quality for non-numeric results', () => {
    const quality = evaluateAnswerQuality({
      problemType: 'fractions',
      correctAnswer: '1/2',
      studentAnswer: '2/4',
      isReasonable: true,
      absError: null,
      relativeError: null,
      tolerance: null
    })

    expect(quality).toEqual({
      isReasonable: true,
      absError: null,
      relativeError: null,
      tolerance: null
    })
  })

  it('returns null error metrics when numeric comparison is not possible', () => {
    const quality = evaluateAnswerQuality({
      problemType: 'algebra_simplify',
      correctAnswer: 'x+y',
      studentAnswer: 'y+x'
    })

    expect(quality).toEqual({
      isReasonable: false,
      absError: null,
      relativeError: null,
      tolerance: null
    })
  })
})
