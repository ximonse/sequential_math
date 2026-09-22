import { kv } from '@vercel/kv'
import { mutateStoredRecord, studentStoreError } from './_studentStore.js'
import { canManageClass, hasSchoolScope, isSchoolAdminRole, isSuperAdminRole } from './_teacherRoles.js'

const uniqueIds = values => [...new Set((Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(Boolean))]

export function normalizeGroupName(value) {
  return String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ')
}

export async function listGroupRecords({ store = kv } = {}) {
  const ids = await store.smembers('groups:index') || []
  return (await Promise.all(ids.map(id => store.get(`group:${id}`)))).filter(Boolean)
}

export function mutateGroupRecord(id, transform, options) {
  return mutateStoredRecord('group', String(id || '').trim(), async current => {
    const next = await transform(current)
    if (!next) return next
    return {
      ...next,
      id: String(id || '').trim(),
      name: normalizeGroupName(next.name),
      pupilIds: uniqueIds(next.pupilIds).map(id => id.toUpperCase()),
      teacherIds: uniqueIds(next.teacherIds)
    }
  }, options)
}

export function createGroupRecord(record, options) {
  return mutateGroupRecord(record.id, current => {
    if (current) throw studentStoreError(409, 'Group ID already exists')
    return { ...record, createdAt: record.createdAt || Date.now(), updatedAt: Date.now() }
  }, options)
}

export function deleteGroupRecord(id, options) {
  return mutateGroupRecord(id, current => {
    if (!current) throw studentStoreError(404, 'Gruppen finns inte.')
    return null
  }, options)
}

async function getPupilMemberships(pupilId, { store = kv } = {}) {
  const profile = await store.get(`student:${String(pupilId).toUpperCase()}`)
  if (!profile) throw studentStoreError(404, `Eleven ${pupilId} finns inte.`)
  const classIds = uniqueIds([profile.classId, ...(profile.classIds || [])])
  const classes = (await Promise.all(classIds.map(id => store.get(`class:${id}`)))).filter(Boolean)
  if (classes.length === 0) throw studentStoreError(409, `Eleven ${pupilId} saknar en giltig klass.`)
  return { profile, classes }
}

export async function getGroupMemberContext(pupilIds, schoolId = '', options = {}) {
  const ids = uniqueIds(pupilIds).map(id => id.toUpperCase())
  if (ids.length === 0 || ids.length > 100) throw studentStoreError(400, 'Välj 1–100 elever.')
  const members = await Promise.all(ids.map(id => getPupilMemberships(id, options)))
  const schoolSets = members.map(member => new Set(member.classes.map(record => String(record.schoolId || '')).filter(Boolean)))
  const commonSchools = [...schoolSets[0]].filter(id => schoolSets.every(set => set.has(id)))
  const requestedSchoolId = String(schoolId || '').trim()
  const resolvedSchoolId = requestedSchoolId || commonSchools[0] || ''
  if (!resolvedSchoolId || !members.every(member => member.classes.some(record => String(record.schoolId) === resolvedSchoolId))) {
    throw studentStoreError(400, 'Alla elever i gruppen måste tillhöra samma valda skola.')
  }
  return { pupilIds: ids, schoolId: resolvedSchoolId, members }
}

export function accountCanAccessMember(account, member, schoolId) {
  if (!account || account.disabled === true) return false
  if (isSuperAdminRole(account.role, account.isAdmin)) return true
  if (isSchoolAdminRole(account.role, account.isAdmin)) {
    return Array.isArray(account.schoolIds) && account.schoolIds.map(String).includes(String(schoolId))
  }
  return member.classes.some(record => String(record.schoolId) === String(schoolId) && canManageClass({
    teacherId: account.id,
    role: account.role,
    isAdmin: account.isAdmin,
    schoolIds: account.schoolIds
  }, record))
}

export function authCanManageGroup(auth, group) {
  if (!auth || !group) return false
  if (isSuperAdminRole(auth.role, auth.isAdmin)) return true
  if (isSchoolAdminRole(auth.role, auth.isAdmin)) return hasSchoolScope(auth, group.schoolId)
  return Array.isArray(group.teacherIds) && group.teacherIds.map(String).includes(String(auth.teacherId))
}

export function assertAuthCanUseMembers(auth, context) {
  if (!hasSchoolScope(auth, context.schoolId)) throw studentStoreError(403, 'Gruppen ligger utanför din skoltilldelning.')
  const account = { ...auth, id: auth.teacherId }
  if (!context.members.every(member => accountCanAccessMember(account, member, context.schoolId))) {
    throw studentStoreError(403, 'Du måste redan ha åtkomst till varje elev i gruppen.')
  }
}

export async function assertGroupCanBeShared(teacherIds, context, { store = kv } = {}) {
  const ids = uniqueIds(teacherIds)
  if (ids.length === 0) throw studentStoreError(400, 'Gruppen måste ha minst en lärare.')
  const accounts = await Promise.all(ids.map(id => store.get(`teacher_account:${id}`)))
  if (accounts.some(account => !account)) throw studentStoreError(404, 'En vald lärare finns inte.')
  if (accounts.some(account => !context.members.every(member => accountCanAccessMember(account, member, context.schoolId)))) {
    throw studentStoreError(403, 'Alla gruppens lärare måste redan ha åtkomst till samtliga elever.')
  }
}

export async function listGroupTeacherCandidates(auth, groups, { store = kv } = {}) {
  const accountIds = await store.smembers('teacher_accounts:index') || []
  const accounts = (await Promise.all(accountIds.map(id => store.get(`teacher_account:${id}`)))).filter(Boolean)
  const schoolIds = new Set(groups.map(group => String(group.schoolId || '')).filter(Boolean))
  return accounts.filter(account => account.disabled !== true && (
    isSuperAdminRole(auth.role, auth.isAdmin)
      || (account.schoolIds || []).some(id => hasSchoolScope(auth, id) && (schoolIds.size === 0 || schoolIds.has(String(id))))
      || account.id === auth.teacherId
  )).map(account => ({ id: account.id, displayName: account.displayName || account.username || account.id }))
}

export async function revalidateGroupsForPupil(pupilId, { store = kv } = {}) {
  const normalizedId = String(pupilId).toUpperCase()
  const groups = (await listGroupRecords({ store })).filter(group => (group.pupilIds || []).includes(normalizedId))
  for (const group of groups) {
    const context = await getGroupMemberContext([normalizedId], group.schoolId, { store }).catch(() => null)
    const accounts = await Promise.all((group.teacherIds || []).map(id => store.get(`teacher_account:${id}`)))
    const valid = context && accounts.every(account => account && accountCanAccessMember(account, context.members[0], group.schoolId))
    if (!valid) await mutateGroupRecord(group.id, current => current ? {
      ...current,
      pupilIds: (current.pupilIds || []).filter(id => id !== normalizedId),
      updatedAt: Date.now()
    } : undefined, { store })
  }
}

export async function revalidateGroupsForTeacher(teacherId, account, { store = kv } = {}) {
  const groups = (await listGroupRecords({ store })).filter(group => (group.teacherIds || []).includes(String(teacherId)))
  for (const group of groups) {
    const context = await getGroupMemberContext(group.pupilIds || [], group.schoolId, { store }).catch(() => null)
    const valid = context && context.members.every(member => accountCanAccessMember(account, member, group.schoolId))
    if (!valid) await mutateGroupRecord(group.id, current => current ? {
      ...current,
      teacherIds: (current.teacherIds || []).filter(id => id !== String(teacherId)),
      updatedAt: Date.now()
    } : undefined, { store })
  }
}
