import { describe, expect, it } from 'vitest'
import {
  TRAINING_MODES,
  TRAINING_SOURCES,
  buildTrainingContext,
  isValidTrainingContext
} from './trainingContext'

describe('training context contract', () => {
  it.each([
    {
      label: 'free adaptive training',
      input: { sessionId: 'session-1', freeOps: ['addition', 'division'], progressionMode: 'steady' },
      expected: { mode: TRAINING_MODES.FREE_ADAPTIVE, source: TRAINING_SOURCES.FREE_TRAINING, allowedSkills: ['addition', 'division'], levelRange: null }
    },
    {
      label: 'student area focus',
      input: { sessionId: 'session-2', mode: 'fractions' },
      expected: { mode: TRAINING_MODES.AREA_FOCUS, source: TRAINING_SOURCES.STUDENT_FOCUS, allowedSkills: ['fractions'], levelRange: null }
    },
    {
      label: 'student level focus',
      input: { sessionId: 'session-3', mode: 'division', fixedLevel: 4 },
      expected: { mode: TRAINING_MODES.LEVEL_FOCUS, source: TRAINING_SOURCES.STUDENT_FOCUS, allowedSkills: ['division'], levelRange: [4, 4] }
    },
    {
      label: 'teacher adaptive assignment',
      input: { sessionId: 'session-4', assignment: { id: 'asg-1', kind: 'standard', problemTypes: ['addition', 'subtraction'], minLevel: 2, maxLevel: 5 } },
      expected: { mode: TRAINING_MODES.TEACHER_ADAPTIVE, source: TRAINING_SOURCES.TEACHER_ASSIGNMENT, assignmentId: 'asg-1', assignmentKind: 'standard', allowedSkills: ['addition', 'subtraction'], levelRange: [2, 5] }
    },
    {
      label: 'teacher locked assignment',
      input: { sessionId: 'session-5', assignment: { id: 'asg-2', kind: 'standard', problemTypes: ['multiplication'], minLevel: 3, maxLevel: 3 } },
      expected: { mode: TRAINING_MODES.TEACHER_LOCKED, source: TRAINING_SOURCES.TEACHER_ASSIGNMENT, assignmentId: 'asg-2', assignmentKind: 'standard', allowedSkills: ['multiplication'], levelRange: [3, 3] }
    },
    {
      label: 'NCM assignment',
      input: { sessionId: 'session-6', assignment: { id: 'asg-ncm', kind: 'ncm', ncmAbilityTags: ['conceptual', 'reasoning'] } },
      expected: { mode: TRAINING_MODES.NCM_ASSIGNMENT, source: TRAINING_SOURCES.TEACHER_ASSIGNMENT, assignmentId: 'asg-ncm', assignmentKind: 'ncm', allowedSkills: ['conceptual', 'reasoning'] }
    },
    {
      label: 'table drill',
      input: { sessionId: 'session-7', isTableDrill: true, tableSet: [7, 3, 7] },
      expected: { mode: TRAINING_MODES.TABLE_DRILL, source: TRAINING_SOURCES.STUDENT_FOCUS, allowedSkills: ['multiplication'], tableSet: [3, 7] }
    }
  ])('builds $label', ({ input, expected }) => {
    const context = buildTrainingContext(input)
    expect(context).toMatchObject(expected)
    expect(isValidTrainingContext(context)).toBe(true)
  })

  it('rejects incomplete or unknown contexts', () => {
    const valid = buildTrainingContext({ sessionId: 'session-1' })
    expect(isValidTrainingContext({ ...valid, mode: 'mystery' })).toBe(false)
    expect(isValidTrainingContext({ ...valid, levelRange: [5, 2] })).toBe(false)
  })

  it('keeps an absent validated mode as free training', () => {
    expect(buildTrainingContext({ sessionId: 'session-8', mode: '' })).toMatchObject({
      mode: TRAINING_MODES.FREE_ADAPTIVE,
      source: TRAINING_SOURCES.FREE_TRAINING
    })
  })
})
