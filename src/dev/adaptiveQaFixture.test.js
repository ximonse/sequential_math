import { describe, expect, it } from 'vitest'
import {
  ADAPTIVE_QA_CLASS_ID,
  ADAPTIVE_QA_CLASS_NAME,
  ADAPTIVE_QA_STUDENT_ID,
  createAdaptiveQaProfile
} from './adaptiveQaFixture'

describe('adaptive QA fixture', () => {
  it('starts from an empty current profile in an isolated synthetic class', () => {
    const profile = createAdaptiveQaProfile(1234)

    expect(profile).toMatchObject({
      studentId: ADAPTIVE_QA_STUDENT_ID,
      name: 'QA-elev',
      grade: 6,
      created_at: 1234,
      classId: ADAPTIVE_QA_CLASS_ID,
      classIds: [ADAPTIVE_QA_CLASS_ID],
      className: ADAPTIVE_QA_CLASS_NAME,
      currentDifficulty: 1,
      recentProblems: [],
      problemLog: [],
      masteryFacts: { version: 1, facts: [], revokedIds: [] }
    })
  })
})
