import { validateSchoolId } from './_schoolStore.js'
import { kv } from '@vercel/kv'
import { mutateStoredRecord, mutateStudentRecord, studentStoreError } from './_studentStore.js'

export function mutateClassRecord(id, transform, options) {
  return mutateStoredRecord('class', id, async current => {
    const next = await transform(current)
    if (next && (!current || next.schoolId !== current.schoolId)) await validateSchoolId(next.schoolId)
    return next ? { ...next, id } : next
  }, options)
}

export function createClassRecord(record, options) {
  return mutateClassRecord(record.id, current => {
    if (current) throw studentStoreError(409, 'Class ID already exists')
    return record
  }, options)
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
