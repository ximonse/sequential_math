import { describe, expect, it } from 'vitest'
import { canManageClass, canManageTeacher, normalizeTeacherRole } from './_teacherRoles.js'

describe('teacher role boundaries', () => {
  it('does not infer global administration from a non-teacher role', () => {
    expect(normalizeTeacherRole('school_admin')).toBe('school_admin')
    expect(normalizeTeacherRole('unexpected')).toBe('teacher')
    expect(normalizeTeacherRole('', true)).toBe('super_admin')
  })

  it('limits school administrators to their school and ordinary teachers to assigned classes', () => {
    const schoolAdmin = { teacherId: 'admin-1', role: 'school_admin', schoolIds: ['north'] }
    const teacher = { teacherId: 'teacher-1', role: 'teacher', schoolIds: ['north'] }
    expect(canManageClass(schoolAdmin, { schoolId: 'north', teacherIds: ['other'] })).toBe(true)
    expect(canManageClass(schoolAdmin, { schoolId: 'south', teacherIds: ['admin-1'] })).toBe(false)
    expect(canManageClass(teacher, { schoolId: 'north', teacherIds: ['teacher-1'] })).toBe(true)
    expect(canManageTeacher(schoolAdmin, { role: 'teacher', schoolIds: ['north'] })).toBe(true)
    expect(canManageTeacher(schoolAdmin, { role: 'teacher', schoolIds: ['north', 'south'] })).toBe(false)
  })
})
