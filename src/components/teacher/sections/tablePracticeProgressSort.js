export const TABLE_STUDENT_COLUMNS = [
  ['name', 'Elev'], ['attempts', 'Svar'], ['correct', 'Rätt'],
  ['accuracy', 'Andel rätt'], ['previous', 'Tidigare'],
  ['median', 'Median rätt'], ['factors', 'Faktorer'],
  ['completions', 'Rundor'], ['evidence', 'Underlag']
]

export const defaultTableStudentSortDir = key => key === 'name' || key === 'evidence' ? 'asc' : 'desc'

function valueFor(item, key) {
  if (key === 'name') return item.name || ''
  if (key === 'evidence') {
    if (!item.available) return 4
    if (!item.historyComplete) return 3
    if (item.current.attempts === 0) return 2
    return item.current.smallSample ? 1 : 0
  }
  if (!item.available) return null
  if (key === 'previous') return item.previous.accuracy
  if (key === 'median') return item.current.medianTimeSec
  if (key === 'accuracy') return item.current.accuracy
  if (key === 'factors') return item.current.factorsCovered
  if (key === 'completions') return item.current.completions
  return item.current[key]
}

export function sortTableStudents(students, key, direction) {
  return [...students].sort((a, b) => {
    const aValue = valueFor(a, key)
    const bValue = valueFor(b, key)
    const aMissing = aValue == null || (typeof aValue === 'number' && !Number.isFinite(aValue))
    const bMissing = bValue == null || (typeof bValue === 'number' && !Number.isFinite(bValue))
    if (aMissing !== bMissing) return aMissing ? 1 : -1
    let comparison = 0
    if (!aMissing) comparison = typeof aValue === 'string'
      ? aValue.localeCompare(bValue, 'sv') : aValue - bValue
    if (comparison !== 0) return direction === 'asc' ? comparison : -comparison
    return String(a.name || '').localeCompare(String(b.name || ''), 'sv')
      || String(a.studentId || '').localeCompare(String(b.studentId || ''), 'sv')
  })
}
