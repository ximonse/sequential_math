import { kv } from '@vercel/kv'
import { studentStoreError } from './_studentStore.js'
import { isSuperAdminRole, normalizeTeacherRole } from './_teacherRoles.js'

export async function validateSchoolId(value) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string' || value.length > 100) throw studentStoreError(400, 'Ogiltig skola.')
  const record = await kv.get(`school:${value}`)
  if (!record || await kv.exists(`school_deleted:${value}`)) throw studentStoreError(400, 'Skolan finns inte. Hämta skolorna igen.')
  return value
}

// Which teachers a class save has to check against the school. Teachers who
// were already on the class and stay on it are left alone, so an old assignment
// can never block an unrelated save; everyone is checked when the school changes.
export function teachersToCheckForSchool({ oldTeacherIds = [], newTeacherIds = [], oldSchoolId = '', newSchoolId = '' }) {
  const next = newTeacherIds.map(String)
  if (String(oldSchoolId || '') !== String(newSchoolId || '')) return next
  const before = new Set(oldTeacherIds.map(String))
  return next.filter(id => !before.has(id))
}

export async function assertTeachersBelongToSchool(teacherIds, schoolId) {
  const normalizedSchoolId = await validateSchoolId(schoolId)
  if (!normalizedSchoolId || !Array.isArray(teacherIds) || teacherIds.length === 0) return normalizedSchoolId

  const accounts = await Promise.all(teacherIds.map(id => kv.get(`teacher_account:${String(id)}`)))
  const outside = accounts.map((account, index) => ({ account, id: String(teacherIds[index]) })).filter(({ account }) => (
    !account || (!isSuperAdminRole(normalizeTeacherRole(account.role, account.isAdmin)) && !(Array.isArray(account.schoolIds) && account.schoolIds.map(String).includes(normalizedSchoolId)))
  ))
  if (outside.length > 0) {
    const names = outside.map(({ account, id }) => account?.displayName || account?.username || id).join(', ')
    throw studentStoreError(400, `Dessa lärare tillhör inte klassens skola: ${names}. Lägg till skolan på läraren först.`)
  }
  return normalizedSchoolId
}

export async function listSchools() {
  const ids = await kv.smembers('schools:index')
  const records = await Promise.all((ids || []).map(async id => {
    if (await kv.exists(`school_deleted:${id}`)) return null
    const record = await kv.get(`school:${id}`)
    return record?.id && record?.name ? { id: record.id, name: record.name } : null
  }))
  return records.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'sv'))
}
