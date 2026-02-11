const TEACHER_AUTH_KEY = 'mathapp_teacher_auth'
const TEACHER_PASSWORD_OVERRIDE_KEY = 'mathapp_teacher_password_override'
const TEACHER_API_TOKEN_KEY = 'mathapp_teacher_api_token'
const DEFAULT_TEACHER_PASSWORD = 'teacher123'

export function getTeacherPassword() {
  const custom = localStorage.getItem(TEACHER_PASSWORD_OVERRIDE_KEY)
  if (typeof custom === 'string' && custom.trim() !== '') {
    return custom
  }

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
  sessionStorage.setItem(TEACHER_API_TOKEN_KEY, password)
  return true
}

export function logoutTeacher() {
  sessionStorage.removeItem(TEACHER_AUTH_KEY)
  sessionStorage.removeItem(TEACHER_API_TOKEN_KEY)
}

export function isTeacherAuthenticated() {
  return sessionStorage.getItem(TEACHER_AUTH_KEY) === '1'
}

export function setCustomTeacherPassword(newPassword) {
  if (typeof newPassword !== 'string' || newPassword.trim().length < 4) {
    return false
  }
  localStorage.setItem(TEACHER_PASSWORD_OVERRIDE_KEY, newPassword.trim())
  return true
}

export function clearCustomTeacherPassword() {
  localStorage.removeItem(TEACHER_PASSWORD_OVERRIDE_KEY)
}

export function getTeacherPasswordSource() {
  const custom = localStorage.getItem(TEACHER_PASSWORD_OVERRIDE_KEY)
  if (typeof custom === 'string' && custom.trim() !== '') return 'custom'

  const configured = import.meta.env.VITE_TEACHER_PASSWORD
  if (typeof configured === 'string' && configured.trim() !== '') return 'env'

  return 'default'
}

export function getTeacherApiToken() {
  return sessionStorage.getItem(TEACHER_API_TOKEN_KEY) || ''
}
