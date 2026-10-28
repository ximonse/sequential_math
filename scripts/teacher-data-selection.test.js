import { expect, it } from 'vitest'
import { selectTeacherPupils } from './teacher-data-selection.mjs'

const profiles = [{ studentId: 'A', classId: 'six', className: '6', classIds: ['group'] },
  { studentId: 'B', classId: 'sixteen', className: '16' }, { studentId: 'C', classId: 'otherSix', className: '6' }]
const classes = [{ classId: 'six', name: '6' }, { classId: 'sixteen', name: '16' },
  { classId: 'otherSix', name: '6' }, { classId: 'group', name: 'Grupp' }]
it('selects exact authorized class IDs and secondary memberships without matching class 16', () => {
  expect(selectTeacherPupils(profiles, { classes, classId: 'six' }).matches.map(p => p.studentId)).toEqual(['A'])
  expect(selectTeacherPupils(profiles, { classes, classId: 'group' }).matches.map(p => p.studentId)).toEqual(['A'])
  expect(() => selectTeacherPupils(profiles, { classes, classId: 'private' })).toThrow(/tillgängligt/u)
})
it('requires an explicit ID for duplicate class names and never falls back to substring matching', () => {
  expect(() => selectTeacherPupils(profiles, { classes, classExact: '6' })).toThrow(/Flera/u)
  expect(() => selectTeacherPupils(profiles, { classes, classExact: 'saknas' })).toThrow(/Ingen/u)
  expect(selectTeacherPupils(profiles, { classes, classExact: ' grupp ' }).selectedClassId).toBe('group')
  expect(selectTeacherPupils(profiles, { classQuery: '6' }).matches).toHaveLength(3)
  expect(() => selectTeacherPupils(profiles, { classes, classId: 'six', classQuery: '6' })).toThrow(/bara ett/u)
})
