import { describe, it, expect } from 'vitest'
import { getDomain } from '../registry'

// Base 100 makes the answer identical to the percentage, so it teaches nothing
// once the idea has landed. It should stay an occasional entry point.
describe('procent nivå 1', () => {
  it('ger mest baser som kräver en uträkning', () => {
    const domain = getDomain('percentage')
    const problems = Array.from({ length: 12 }, () => domain.generate('percentage', 1, {}))
    const trivial = problems.filter(problem => problem.metadata?.content?.base === 100)
    expect(trivial.length).toBeLessThanOrEqual(4)
    expect(problems.length - trivial.length).toBeGreaterThanOrEqual(8)
  })

  it('ger heltalssvar', () => {
    const domain = getDomain('percentage')
    for (let i = 0; i < 24; i++) {
      const problem = domain.generate('percentage', 1, {})
      expect(Number.isInteger(problem.answer?.correct ?? problem.result)).toBe(true)
    }
  })
})
