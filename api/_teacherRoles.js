export const TEACHER_ROLE = 'teacher'
export const SCHOOL_ADMIN_ROLE = 'school_admin'
export const SUPER_ADMIN_ROLE = 'super_admin'

const KNOWN_ROLES = new Set([TEACHER_ROLE, SCHOOL_ADMIN_ROLE, SUPER_ADMIN_ROLE])

export function normalizeTeacherRole(role, legacyIsAdmin = false) {
  const normalized = String(role || '').trim().toLowerCase()
  if (KNOWN_ROLES.has(normalized)) return normalized
  return legacyIsAdmin ? SUPER_ADMIN_ROLE : TEACHER_ROLE
}

export function isSchoolAdminRole(role, legacyIsAdmin = false) {
  const normalized = normalizeTeacherRole(role, legacyIsAdmin)
  return normalized === SCHOOL_ADMIN_ROLE || normalized === SUPER_ADMIN_ROLE
}

export function isSuperAdminRole(role, legacyIsAdmin = false) {
  return normalizeTeacherRole(role, legacyIsAdmin) === SUPER_ADMIN_ROLE
}

export function hasSchoolScope(auth, schoolId) {
  if (!auth || !schoolId) return false
  if (isSuperAdminRole(auth.role, auth.isAdmin)) return true
  return Array.isArray(auth.schoolIds) && auth.schoolIds.map(String).includes(String(schoolId))
}

export function canManageClass(auth, classRecord) {
  if (!auth || !classRecord) return false
  if (isSuperAdminRole(auth.role, auth.isAdmin)) return true
  if (isSchoolAdminRole(auth.role, auth.isAdmin)) return hasSchoolScope(auth, classRecord.schoolId)
  return Array.isArray(classRecord.teacherIds) && classRecord.teacherIds.map(String).includes(String(auth.teacherId))
}

export function canManageTeacher(auth, account) {
  if (!auth || !account) return false
  if (isSuperAdminRole(auth.role)) return true
  if (!isSchoolAdminRole(auth.role) || normalizeTeacherRole(account.role, account.isAdmin) !== TEACHER_ROLE) return false
  const accountSchools = Array.isArray(account.schoolIds) ? account.schoolIds.map(String) : []
  return accountSchools.length > 0 && accountSchools.every(schoolId => hasSchoolScope(auth, schoolId))
}
