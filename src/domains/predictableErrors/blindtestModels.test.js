import { describe, expect, it } from 'vitest'
import { predictableCandidates } from './index.js'
import { swapLastTwoDigits } from './arithmetic.js'

const p = (type, a, b) => ({ domain: 'arithmetic', type, skill: type, values: { a, b } })
const ids = (type, a, b, answer) => predictableCandidates(p(type, a, b), answer).matches.map(m => m.modelId)

// Models added after the blind test on 2026-11-01 (examples from that test).
describe('models found missing in the blind test', () => {
  it('recognises the tens decreased without any exchange', () => {
    expect(ids('subtraction', 82, 2, 70)).toContain('unnecessary_exchange')
    expect(ids('subtraction', 764, 231, 523)).toContain('unnecessary_exchange')
    // An exchange in the ones is not this model.
    expect(ids('subtraction', 52, 38, 4)).not.toContain('unnecessary_exchange')
  })

  it('recognises one of several carries forgotten, not only all of them', () => {
    expect(ids('addition', 357, 268, 525)).toEqual(['one_carry_forgotten'])
    expect(ids('addition', 587, 246, 733)).toEqual(['one_carry_forgotten'])
    expect(ids('addition', 357, 268, 515)).toContain('carry_forget')
    // A single carry is the ordinary forgotten carry, not this model.
    expect(ids('addition', 47, 35, 72)).not.toContain('one_carry_forgotten')
  })

  it('recognises the last two digits written in the wrong order', () => {
    expect(swapLastTwoDigits(745)).toBe(754)
    expect(ids('subtraction', 74, 3, 17)).toContain('last_two_digits_swapped')
    expect(ids('addition', 283, 462, 754)).toContain('last_two_digits_swapped')
    expect(swapLastTwoDigits(5)).toBeNull()
  })
})

// Models added after blind test 2 (2026-11-01, rule version v5).
describe('models found missing in blind test 2', () => {
  it('recognises a correct first exchange followed by an inverted second one (0 − x = x)', () => {
    for (const [a, b, answer] of [[402, 178, 274], [503, 267, 266], [621, 384, 377], [604, 238, 336], [732, 458, 334]]) {
      expect(ids('subtraction', a, b, answer), `${a} − ${b}`).toContain('second_exchange_inverted')
    }
    // With a single exchange the rule gives the correct answer, so it is not a candidate.
    expect(predictableCandidates(p('subtraction', 652, 128), '').predictions.map(x => x.modelId)).not.toContain('second_exchange_inverted')
  })

  it('recognises over-generalised exchanges and an added carry', () => {
    expect(ids('subtraction', 371, 145, 126)).toContain('unnecessary_exchange')
    expect(ids('addition', 41, 6, 57)).toContain('phantom_carry')
    expect(ids('addition', 268, 431, 709)).toContain('phantom_carry')
    // A real carry is not a phantom one.
    expect(ids('addition', 47, 35, 92)).not.toContain('phantom_carry')
  })
})
