import { normalizeTeacherRole, SUPER_ADMIN_ROLE } from './teacherRoles.js'

// Explicitly assigned teacher grants are a future product decision, not enabled today.
// Check the authenticated account, independently of the selected dashboard workspace.
export const canViewAttentionResults = identity => normalizeTeacherRole(identity?.role, identity?.isAdmin) === SUPER_ADMIN_ROLE

export function attentionProfileForViewer(profile, identity) {
  if (!profile || canViewAttentionResults(identity)) return profile
  const safe = { ...profile }
  delete safe.attentionHistory
  return safe
}
