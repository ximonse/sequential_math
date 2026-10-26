import { describe, expect, it } from 'vitest'
import { assignedClassIds, selectableClassesForTeacher, teacherClassChanges } from './teacherClassAssignmentHelpers'

const classes = [
  { id: 'c1', name: '6A', schoolId: 's1', teacherIds: ['t1', 't2'] },
  { id: 'c2', name: '6B', schoolId: 's1', teacherIds: [] },
  { id: 'c3', name: '7A', schoolId: 's2', teacherIds: [] },
  { id: 'c4', name: 'Gammal', schoolId: 's1', archived: true, teacherIds: [] },
  { id: 'c5', name: 'Utan skola', teacherIds: [] }
]

describe('teacher class assignment helpers', () => {
  it('lists the teacher classes plus live classes from the teacher schools', () => {
    const teacher = { id: 't3', role: 'teacher', schoolIds: ['s1'] }
    expect(selectableClassesForTeacher(classes, teacher).map(c => c.id)).toEqual(['c1', 'c2', 'c5'])
  })

  it('keeps an archived class visible while the teacher still has it', () => {
    const withArchived = classes.map(c => c.id === 'c4' ? { ...c, teacherIds: ['t3'] } : c)
    expect(selectableClassesForTeacher(withArchived, { id: 't3', schoolIds: [] }).map(c => c.id)).toContain('c4')
  })

  it('follows school choices made in the open form', () => {
    const teacher = { id: 't3', role: 'teacher', schoolIds: [] }
    expect(selectableClassesForTeacher(classes, teacher, ['s2']).map(c => c.id)).toContain('c3')
    expect(selectableClassesForTeacher(classes, teacher, ['s2']).map(c => c.id)).not.toContain('c2')
  })

  it('reads current assignments from the class records', () => {
    expect(assignedClassIds(classes, 't1')).toEqual(['c1'])
  })

  it('returns only changed classes and keeps other teachers', () => {
    const changes = teacherClassChanges({ classes, teacherId: 't1', selectedClassIds: ['c2', 'c5'] })
    expect(changes).toEqual([
      { classId: 'c1', name: '6A', adds: false, teacherIds: ['t2'] },
      { classId: 'c2', name: '6B', adds: true, teacherIds: ['t1'] },
      { classId: 'c5', name: 'Utan skola', adds: true, teacherIds: ['t1'] }
    ])
  })

  it('returns nothing when the selection matches', () => {
    expect(teacherClassChanges({ classes, teacherId: 't1', selectedClassIds: ['c1'] })).toEqual([])
  })
})
