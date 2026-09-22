import { validateSchoolId } from './_schoolStore.js'
import { kv } from '@vercel/kv'
import { mutateStoredRecord, mutateStudentRecord, studentStoreError } from './_studentStore.js'

export function normalizeClassName(value) {
  return String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv')
}

export async function assertClassNameAvailable({ id, name, schoolId }) {
  const normalizedName = normalizeClassName(name)
  if (!normalizedName) throw studentStoreError(400, 'Ange klassnamn.')
  if (!schoolId) return
  const ids = await kv.smembers('classes:index') || []
  const records = await Promise.all(ids.map(classId => kv.get(`class:${classId}`)))
  const duplicate = records.some(record => record && !record.archived && record.id !== id && record.schoolId === schoolId && normalizeClassName(record.name) === normalizedName)
  if (duplicate) throw studentStoreError(409, 'Det finns redan en klass med det namnet på den här skolan.')
}

export function mutateClassRecord(id, transform, options) {
  return mutateStoredRecord('class', id, async current => {
    const next = await transform(current)
    if (next && (!current || next.schoolId !== current.schoolId)) await validateSchoolId(next.schoolId)
    if (next && !options?.skipClassNameCheck) await assertClassNameAvailable({ id, name: next.name, schoolId: next.schoolId })
    return next ? { ...next, id } : next
  }, options)
}

export function createClassRecord(record, options) {
  return mutateClassRecord(record.id, current => {
    if (current) throw studentStoreError(409, 'Class ID already exists')
    return record
  }, options)
}

export function archiveClassRecord(id, archivedName) {
  return mutateClassRecord(id, current => {
    if (!current) throw studentStoreError(404, 'Class not found')
    if (current.archived) return current
    const historicalName = String(archivedName || `${current.name} ${new Date().getFullYear()} legacy`).trim()
    return { ...current, name: historicalName, archived: true, archivedAt: Date.now(), activeNameBeforeArchive: current.name }
  }, { skipClassNameCheck: true })
}

export function restoreClassRecord(id, name) {
  return mutateClassRecord(id, current => {
    if (!current) throw studentStoreError(404, 'Class not found')
    if (!current.archived) return current
    const restoredName = String(name || current.activeNameBeforeArchive || '').trim()
    if (!restoredName) throw studentStoreError(400, 'Ange ett aktivt klassnamn vid återställning.')
    return { ...current, name: restoredName, archived: false, archivedAt: null, activeNameBeforeArchive: null }
  })
}

export async function deleteClassRecord(id) {
  try {
    await mutateClassRecord(id, () => null)
  } catch (error) {
    if (error.status !== 410) throw error
  }
  // Retrying deletion also resumes any interrupted membership cleanup.
  const pupilIds = await kv.smembers('students:index')
  for (const pupilId of pupilIds || []) {
    try {
      await mutateStudentRecord(pupilId, async current => {
        if (!current) return undefined
        const before = [...new Set([current.classId, ...(current.classIds || [])].filter(Boolean))]
        if (!before.includes(id)) return undefined
        const classIds = before.filter(classId => classId !== id)
        const classId = classIds.includes(current.classId) ? current.classId : classIds[0] || null
        const nextClass = classId ? await kv.get(`class:${classId}`) : null
        return { ...current, classIds, classId, className: nextClass?.name || null }
      })
    } catch (error) {
      if (error.status !== 410) throw error
    }
  }
  await kv.del(`class_extras:${id}`)
}
