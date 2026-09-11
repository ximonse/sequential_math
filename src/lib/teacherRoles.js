export const TEACHER_ROLE = 'teacher'
export const SCHOOL_ADMIN_ROLE = 'school_admin'
export const SUPER_ADMIN_ROLE = 'super_admin'

const ROLE_LABELS = {
  [TEACHER_ROLE]: 'Lärare',
  [SCHOOL_ADMIN_ROLE]: 'Skoladministratör',
  [SUPER_ADMIN_ROLE]: 'Huvudadministratör'
}

export function normalizeTeacherRole(role, legacyIsAdmin = false) {
  const candidate = String(role || '').trim().toLowerCase()
  if ([TEACHER_ROLE, SCHOOL_ADMIN_ROLE, SUPER_ADMIN_ROLE].includes(candidate)) return candidate
  return legacyIsAdmin ? SUPER_ADMIN_ROLE : TEACHER_ROLE
}

export function getTeacherRoleLabel(role) {
  return ROLE_LABELS[normalizeTeacherRole(role)]
}

export function isSchoolAdmin(role) {
  return [SCHOOL_ADMIN_ROLE, SUPER_ADMIN_ROLE].includes(normalizeTeacherRole(role))
}

export function isSuperAdmin(role) {
  return normalizeTeacherRole(role) === SUPER_ADMIN_ROLE
}
