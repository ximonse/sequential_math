import { SCHOOL_ADMIN_ROLE, SUPER_ADMIN_ROLE, normalizeTeacherRole } from './_teacherRoles.js'

export function buildTeacherRoleMigration(accounts, superAdminUsername) {
  const requestedUsername = String(superAdminUsername || '').trim().toLowerCase()
  if (!requestedUsername) throw new Error('--superadmin-username is required')

  const legacyAdmins = (Array.isArray(accounts) ? accounts : []).filter(account => (
    account && !account.role && account.isAdmin === true
  ))
  const superAdminMatches = legacyAdmins.filter(account => (
    String(account.username || '').trim().toLowerCase() === requestedUsername
  ))
  if (superAdminMatches.length !== 1) {
    throw new Error('The specified super-admin username must match exactly one legacy admin account')
  }

  return legacyAdmins.map(account => {
    const role = account.id === superAdminMatches[0].id ? SUPER_ADMIN_ROLE : SCHOOL_ADMIN_ROLE
    const schoolIds = Array.isArray(account.schoolIds) ? account.schoolIds.map(String).filter(Boolean) : []
    const disabled = role === SCHOOL_ADMIN_ROLE && schoolIds.length === 0
    return {
      id: String(account.id),
      role,
      disabled,
      updated: {
        ...account,
        role: normalizeTeacherRole(role),
        isAdmin: undefined,
        disabled,
        disabledReason: disabled ? 'SCHOOL_SCOPE_REQUIRED' : undefined,
        sessionVersion: Math.max(1, Number(account.sessionVersion) || 1) + 1,
        updatedAt: Date.now()
      }
    }
  })
}
