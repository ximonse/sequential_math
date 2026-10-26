import { describe, expect, it } from 'vitest'
import { teachersToCheckForSchool } from './_schoolStore.js'

describe('teachersToCheckForSchool', () => {
  it('lets a teacher who stays on the class pass without a new school check', () => {
    expect(teachersToCheckForSchool({
      oldTeacherIds: ['old-teacher'], newTeacherIds: ['old-teacher'], oldSchoolId: 's1', newSchoolId: 's1'
    })).toEqual([])
  })

  it('checks only the teacher who is added', () => {
    expect(teachersToCheckForSchool({
      oldTeacherIds: ['old-teacher'], newTeacherIds: ['old-teacher', 'new-teacher'], oldSchoolId: 's1', newSchoolId: 's1'
    })).toEqual(['new-teacher'])
  })

  it('checks everyone when the class moves to another school', () => {
    expect(teachersToCheckForSchool({
      oldTeacherIds: ['a', 'b'], newTeacherIds: ['a', 'b'], oldSchoolId: 's1', newSchoolId: 's2'
    })).toEqual(['a', 'b'])
  })

  it('compares ids as text', () => {
    expect(teachersToCheckForSchool({ oldTeacherIds: [1], newTeacherIds: ['1', 2], oldSchoolId: 's1', newSchoolId: 's1' })).toEqual(['2'])
  })
})
