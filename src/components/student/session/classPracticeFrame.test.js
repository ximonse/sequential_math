import { describe, expect, it } from 'vitest'
import { constrainClassPracticeRules } from './classPracticeFrame'
import { getSessionRules } from './sessionUtils'

describe('class practice frame', () => {
  const allowed = ['addition', 'multiplication']

  it('limits ordinary mixed training to the class selection', () => {
    expect(constrainClassPracticeRules({}, allowed)).toEqual({
      status: 'ready', rules: { allowedTypes: allowed }
    })
  })

  it('rejects a disabled operation from an old direct link', () => {
    expect(constrainClassPracticeRules({ allowedTypes: ['division'] }, allowed).status).toBe('disallowed_operation')
    expect(constrainClassPracticeRules({}, allowed, ['division'], []).status).toBe('disallowed_link')
  })

  it('keeps division out of a mixed session after filtering an old link', () => {
    const selected = ['addition']
    const rules = getSessionRules(null, '', null, 0, [], 'challenge', null, selected, { recentProblems: [] })
    const frame = constrainClassPracticeRules(rules, allowed, ['addition', 'division'], selected)

    expect(frame.status).toBe('ready')
    expect(frame.rules.allowedTypes).toEqual(['addition'])
  })

  it('waits for class settings instead of generating unrestricted problems', () => {
    expect(constrainClassPracticeRules({}, null).status).toBe('loading')
    expect(constrainClassPracticeRules({}, []).status).toBe('unavailable')
  })
})
