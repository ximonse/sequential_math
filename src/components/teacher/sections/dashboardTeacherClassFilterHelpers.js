const TEACHER_CLASS_FILTER_STORAGE_KEY = 'mathapp_teacher_selected_classes_v1'

export function loadSavedTeacherClassFilter() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(TEACHER_CLASS_FILTER_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return Array.from(new Set(
      parsed
        .map(item => String(item || '').trim())
        .filter(Boolean)
    ))
  } catch {
    return []
  }
}

export function saveTeacherClassFilterSelection(classIds) {
  if (typeof window === 'undefined') return
  try {
    const normalized = Array.from(new Set(
      (Array.isArray(classIds) ? classIds : [])
        .map(item => String(item || '').trim())
        .filter(Boolean)
    ))
    if (normalized.length === 0) {
      window.localStorage.removeItem(TEACHER_CLASS_FILTER_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(TEACHER_CLASS_FILTER_STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // no-op
  }
}
