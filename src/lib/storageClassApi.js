import { submitRoster } from './rosterClient'

export function createStorageClassApi(deps) {
  const {
    CLASSES_KEY,
    areClassRecordListsEqual,
    normalizeClassRecords,
  } = deps

  function saveClasses(classes) {
    const normalized = normalizeClassRecords(classes)
    localStorage.setItem(CLASSES_KEY, JSON.stringify(normalized))
  }

  function getClasses() {
    const data = localStorage.getItem(CLASSES_KEY)
    if (!data) return []

    try {
      const parsed = JSON.parse(data)
      if (!Array.isArray(parsed)) return []
      const normalized = normalizeClassRecords(parsed)
      if (!areClassRecordListsEqual(parsed, normalized)) {
        saveClasses(normalized)
      }
      return normalized
    } catch {
      return []
    }
  }

  async function createClassFromRoster(classNameInput, rosterText, grade = 4) {
    const result = await submitRoster({ className: String(classNameInput || '').trim(), rosterText, grade })
    if (result.classRecord) saveClass(result.classRecord)
    return result
  }

  async function addStudentsToClass(classId, rosterText, grade = 4) {
    const target = getClasses().find(item => item.id === classId)
    if (!target) return { ok: false, error: 'Välj en klass att lägga till elever i.' }
    const result = await submitRoster({ classId, rosterText, grade })
    if (result.classRecord) {
      result.classRecord.studentIds = [...new Set([...(target.studentIds || []), ...result.classRecord.studentIds])]
      saveClass(result.classRecord)
    }
    return result
  }

  async function addExistingStudentsToClass(classId, studentIds, grade = 4) {
    const target = getClasses().find(item => item.id === classId)
    const existingStudentIds = [...new Set(
      (Array.isArray(studentIds) ? studentIds : [])
        .map(id => String(id || '').trim().toUpperCase())
        .filter(Boolean)
    )]
    if (!target) return { ok: false, error: 'Välj en klass att lägga till elever i.' }
    if (existingStudentIds.length === 0) return { ok: false, error: 'Välj minst en befintlig elev.' }
    const result = await submitRoster({ classId, rosterText: '', grade, existingStudentIds })
    if (result.classRecord) {
      result.classRecord.studentIds = [...new Set([...(target.studentIds || []), ...result.classRecord.studentIds])]
      saveClass(result.classRecord)
    }
    return result
  }

  function updateClassExtras(classId, extras) {
    const targetId = String(classId || '').trim()
    if (!targetId) return false
    const classes = getClasses()
    const idx = classes.findIndex(c => String(c.id || '').trim() === targetId)
    if (idx < 0) return false
    classes[idx] = { ...classes[idx], enabledExtras: Array.isArray(extras) ? extras : [] }
    saveClasses(classes)
    return true
  }

  function removeClass(classId) {
    const targetClassId = String(classId || '').trim()
    if (!targetClassId) return

    const classes = getClasses().filter(c => String(c.id || '').trim() !== targetClassId)
    saveClasses(classes)

  }

  function saveClass(classRecord) {
    if (!classRecord || !classRecord.id) return
    const classes = getClasses()
    const idx = classes.findIndex(c => c.id === classRecord.id)
    if (idx >= 0) {
      classes[idx] = { ...classes[idx], ...classRecord }
    } else {
      classes.unshift({ studentIds: [], enabledExtras: [], ...classRecord })
    }
    saveClasses(classes)
  }

  return {
    addExistingStudentsToClass,
    addStudentsToClass,
    createClassFromRoster,
    getClasses,
    removeClass,
    saveClass,
    updateClassExtras
  }
}
