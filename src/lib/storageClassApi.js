import { submitRoster } from './rosterClient'
import {
  getCachedClasses,
  removeCachedClass,
  replaceCachedClasses,
  upsertCachedClass
} from './serverDataCache'

/**
 * Classes are server records. The browser cache lasts only for the open page
 * and avoids repeating reads while a teacher works.
 */
export function createStorageClassApi({ normalizeClassRecords }) {
  function getClasses() {
    return normalizeClassRecords(getCachedClasses())
  }

  function hydrateClasses(classes) {
    return replaceCachedClasses(normalizeClassRecords(classes))
  }

  async function createClassFromRoster(classNameInput, rosterText, grade = 4, schoolId = '') {
    const result = await submitRoster({ className: String(classNameInput || '').trim(), rosterText, grade, schoolId })
    if (result.classRecord) upsertCachedClass(result.classRecord)
    return result
  }

  async function addStudentsToClass(classId, rosterText, grade = 4) {
    const result = await submitRoster({ classId, rosterText, grade })
    if (result.classRecord) upsertCachedClass(result.classRecord)
    return result
  }

  async function addExistingStudentsToClass(classId, studentIds, grade = 4) {
    const existingStudentIds = [...new Set((Array.isArray(studentIds) ? studentIds : [])
      .map(id => String(id || '').trim().toUpperCase()).filter(Boolean))]
    if (!classId) return { ok: false, error: 'Välj en klass att lägga till elever i.' }
    if (existingStudentIds.length === 0) return { ok: false, error: 'Välj minst en befintlig elev.' }
    const result = await submitRoster({ classId, rosterText: '', grade, existingStudentIds })
    if (result.classRecord) upsertCachedClass(result.classRecord)
    return result
  }

  function updateClassExtras(classId, extras) {
    const current = getClasses().find(record => record.id === String(classId || '').trim())
    if (!current) return false
    upsertCachedClass({ ...current, enabledExtras: Array.isArray(extras) ? extras : [] })
    return true
  }

  function removeClass(classId) {
    removeCachedClass(classId)
  }

  function saveClass(classRecord) {
    upsertCachedClass(classRecord)
  }

  return {
    addExistingStudentsToClass,
    addStudentsToClass,
    createClassFromRoster,
    getClasses,
    hydrateClasses,
    removeClass,
    saveClass,
    updateClassExtras
  }
}
