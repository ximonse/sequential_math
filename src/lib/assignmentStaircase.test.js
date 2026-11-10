import { describe, expect, it } from 'vitest'
import { assignmentStaircaseLevel } from './assignmentQueue.js'
import { getSessionRules } from '../components/student/session/sessionUtils.js'

describe('link assignment staircase', () => {
  it('goes from the easiest level to the hardest, spread over the questions', () => {
    const assignment = { kind: 'standard', levelMode: 'staircase', problemTypes: ['addition'], minLevel: 3, maxLevel: 5, targetCount: 15 }
    const levels = Array.from({ length: 15 }, (_, solved) => assignmentStaircaseLevel(assignment, solved))
    expect(levels).toEqual([3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5])
    expect(assignmentStaircaseLevel(assignment, 40)).toBe(5)
  })

  it('leaves a single locked level and other kinds alone', () => {
    expect(assignmentStaircaseLevel({ levelMode: 'staircase', minLevel: 4, maxLevel: 4, targetCount: 10 }, 3)).toBe(null)
    expect(assignmentStaircaseLevel({ kind: 'standard', levelMode: 'staircase', problemTypes: ['doubles'], minLevel: 1, maxLevel: 12, targetCount: 20 }, 5)).toBe(null)
    expect(getSessionRules({ kind: 'math_practice', problemTypes: ['addition'], minLevel: 1, maxLevel: 6 }, null, null, 2).forcedLevel).toBeUndefined()
  })

  it('forces the staircase level in the session rules', () => {
    const rules = getSessionRules({ kind: 'standard', levelMode: 'staircase', problemTypes: ['addition'], minLevel: 1, maxLevel: 4, targetCount: 8 }, null, null, 6)
    expect(rules).toMatchObject({ forcedLevel: 4, forceReason: 'assignment_staircase', levelRange: [1, 4] })
  })

  it('adapts to each pupil when the teacher did not choose the staircase', () => {
    const adaptive = { kind: 'standard', problemTypes: ['multiplication'], minLevel: 1, maxLevel: 12, targetCount: 8 }
    expect(assignmentStaircaseLevel(adaptive, 3)).toBe(null)
    expect(getSessionRules(adaptive, null, null, 3).forcedLevel).toBeUndefined()
  })

  it('keeps the chosen level mode through the shared link', async () => {
    const { encodeAssignmentPayload, decodeAssignmentPayload } = await import('./assignments.js')
    const assignment = { id: 'a1', kind: 'standard', title: 'Division', levelMode: 'staircase', problemTypes: ['division'], minLevel: 2, maxLevel: 6, targetCount: 10 }
    expect(decodeAssignmentPayload(encodeAssignmentPayload(assignment)).levelMode).toBe('staircase')
    expect(decodeAssignmentPayload(encodeAssignmentPayload({ ...assignment, levelMode: undefined })).levelMode).toBeUndefined()
  })
})
