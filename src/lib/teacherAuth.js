const TEACHER_AUTH_KEY = 'mathapp_teacher_auth'
const DEFAULT_TEACHER_PASSWORD = 'teacher123'

export function getTeacherPassword() {
  const configured = import.meta.env.VITE_TEACHER_PASSWORD
  if (typeof configured === 'string' && configured.trim() !== '') {
    return configured
  }
  return DEFAULT_TEACHER_PASSWORD
}

export function verifyTeacherPassword(inputPassword) {
  return inputPassword === getTeacherPassword()
}

export function loginTeacher(password) {
  if (!verifyTeacherPassword(password)) {
    return false
  }
  sessionStorage.setItem(TEACHER_AUTH_KEY, '1')
  return true
}

export function logoutTeacher() {
  sessionStorage.removeItem(TEACHER_AUTH_KEY)
}

export function isTeacherAuthenticated() {
  return sessionStorage.getItem(TEACHER_AUTH_KEY) === '1'
}
