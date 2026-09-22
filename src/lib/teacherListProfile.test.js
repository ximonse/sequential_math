import { describe, expect, it } from 'vitest'
import { toTeacherListProfile } from './teacherListProfile'

describe('toTeacherListProfile', () => {
  it('uses the pseudonymous login alias in teacher-facing lists', () => {
    const profile = {
      studentId: 'PUPIL-1',
      name: 'Alex Andersson',
      displayAlias: 'Blå Räv Bok',
      recentProblems: [],
      stats: {},
      masteryFacts: { facts: [], revokedIds: [] }
    }

    expect(toTeacherListProfile(profile)).toMatchObject({
      name: 'Blå Räv Bok',
      displayAlias: 'Blå Räv Bok'
    })
  })
})
