import { describe, it, expect } from 'vitest'
import { getDomain } from '../registry'

// Procentsatsen 12.5 är den enda tillåtna decimalen i en fråga. Alla andra tal
// (baser, priser, delar) ska vara heltal, och svaret får högst en decimal.
describe('procent: rena tal på alla nivåer', () => {
  it('ger heltal i frågan och enkla svar', () => {
    const domain = getDomain('percentage')
    for (let level = 1; level <= 12; level++) {
      for (let i = 0; i < 400; i++) {
        const problem = domain.generate('percentage', level, {})
        const text = problem.display.text
        const numbers = text.match(/\d+(?:\.\d+)?/g) || []
        for (const number of numbers) {
          expect(Number.isInteger(Number(number)) || number === '12.5', `nivå ${level}: ${text}`).toBe(true)
        }
        const answer = Number(problem.answer.correct)
        expect(Number.isFinite(answer), `nivå ${level}: ${text}`).toBe(true)
        expect(Math.abs(answer * 10 - Math.round(answer * 10)) < 1e-9, `nivå ${level}: ${text} = ${answer}`).toBe(true)
      }
    }
  })
})
