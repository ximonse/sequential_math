import { describe, expect, it } from 'vitest'
import { toTeacherListProfile } from './teacherListProfile'

describe('toTeacherListProfile', () => {
  it('uses the preferred name in teacher-facing lists while retaining the login alias', () => {
    const profile = {
      studentId: 'PUPIL-1',
      name: 'Alex Andersson',
      preferredName: 'Alex',
      displayAlias: 'Blå Räv Bok',
      recentProblems: [],
      stats: {},
      masteryFacts: { facts: [], revokedIds: [] }
    }

    expect(toTeacherListProfile(profile)).toMatchObject({
      name: 'Alex',
      preferredName: 'Alex',
      displayAlias: 'Blå Räv Bok'
    })
  })
})
