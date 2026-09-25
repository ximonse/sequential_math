import { describe, expect, it } from 'vitest'
import { themeRoleForPath } from './themeRole'

// One browser often holds both a pupil session and a teacher session.
describe('temats roll per vy', () => {
  it('räknar lärarvyerna som lärare', () => {
    expect(themeRoleForPath('/teacher')).toBe('teacher')
    expect(themeRoleForPath('/teacher/admin')).toBe('teacher')
    expect(themeRoleForPath('/teacher/student')).toBe('teacher')
  })

  it('räknar elevvyer och inloggning som elev', () => {
    expect(themeRoleForPath('/')).toBe('student')
    expect(themeRoleForPath('/student/ABC123')).toBe('student')
    expect(themeRoleForPath('/student/ABC123/practice')).toBe('student')
    expect(themeRoleForPath('/teacher-login')).toBe('teacher')
  })
})
