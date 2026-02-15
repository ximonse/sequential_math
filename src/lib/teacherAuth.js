const TEACHER_AUTH_KEY = 'mathapp_teacher_auth'
const TEACHER_PASSWORD_OVERRIDE_KEY = 'mathapp_teacher_password_override'
const TEACHER_API_TOKEN_KEY = 'mathapp_teacher_api_token'
const DEV_DEFAULT_TEACHER_PASSWORD = 'teacher123'
const IS_PROD_BUILD = import.meta.env.PROD === true

function getAcceptedTeacherPasswords() {
  const passwords = []
  const custom = localStorage.getItem(TEACHER_PASSWORD_OVERRIDE_KEY)
  const configured = import.meta.env.VITE_TEACHER_PASSWORD

  if (typeof custom === 'string' && custom.trim() !== '') {
    passwords.push(custom.trim())
  }
  if (typeof configured === 'string' && configured.trim() !== '') {
    passwords.push(configured.trim())
  }
  if (!IS_PROD_BUILD) {
    passwords.push(DEV_DEFAULT_TEACHER_PASSWORD)
  }

  return [...new Set(passwords)]
}

export function getTeacherPassword() {
  return getAcceptedTeacherPasswords()[0] || ''
}

export function verifyTeacherPassword(inputPassword) {
  if (!isTeacherPasswordConfigured()) return false
  return getAcceptedTeacherPasswords().includes(String(inputPassword || ''))
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

  return IS_PROD_BUILD ? 'missing' : 'dev_default'
}

export function getTeacherApiToken() {
  return sessionStorage.getItem(TEACHER_API_TOKEN_KEY) || ''
}

export function isTeacherPasswordConfigured() {
  return String(getTeacherPassword() || '').trim() !== ''
}
