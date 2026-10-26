// A dispatch to several classes creates one assignment per class: same title and
// the same questions, created seconds apart. The results view treats those as
// one collection so a group that spans classes is read in a single table.
export const COLLECTION_WINDOW_MS = 10 * 60 * 1000

const questionKey = assignment => (assignment.items || [])
  .map(item => item.taskSnapshot?.promptSv || item.taskId).join('|')

// `assignments` carry their own classId. A class never appears twice in one
// collection, so two dispatches to the same class stay separate.
export function groupCollections(assignments = [], windowMs = COLLECTION_WINDOW_MS) {
  const clusters = []
  for (const assignment of [...assignments].sort((a, b) => a.createdAt - b.createdAt)) {
    const key = `${assignment.titleSv || 'Screening'}::${questionKey(assignment)}`
    const cluster = clusters.find(item => item.key === key && assignment.createdAt - item.lastAt <= windowMs
      && !item.members.some(member => member.classId === assignment.classId))
    if (cluster) {
      cluster.members.push(assignment)
      cluster.lastAt = assignment.createdAt
    } else {
      clusters.push({ key, titleSv: assignment.titleSv || 'Screening', createdAt: assignment.createdAt, lastAt: assignment.createdAt, members: [assignment] })
    }
  }
  return clusters
    .map(({ key: _key, lastAt: _lastAt, ...cluster }) => ({ ...cluster, id: cluster.members.map(member => member.assignmentId).join('+') }))
    .sort((a, b) => b.createdAt - a.createdAt)
}

// Which pupils the picked recipients cover, per class. Whole classes show every
// pupil; otherwise only the picked pupils (directly or through a group).
export function resultFilter(dispatches = []) {
  const byClass = new Map(dispatches.map(item => [String(item.classId), item]))
  return (classId, studentId) => {
    const target = byClass.get(String(classId))
    if (!target) return false
    return target.wholeClass || target.studentIds.some(id => String(id).toLowerCase() === String(studentId).toLowerCase())
  }
}

// Joins the per-class overviews of one collection into one matrix. Columns follow
// the first class by position (assignmentItemId differs per class); every row
// and cell keeps the class and assignment it came from so it can still be opened.
export function mergeOverviews(parts = [], isAllowed = () => true) {
  const base = parts[0]?.overview
  if (!base) return null
  const rows = []
  const seen = new Set()
  const mismatched = []
  for (const { classId, assignmentId, overview } of parts) {
    if (overview.items.length !== base.items.length) {
      mismatched.push(classId)
      continue
    }
    for (const row of overview.rows) {
      if (!isAllowed(classId, row.studentId) || seen.has(row.studentId)) continue
      seen.add(row.studentId)
      rows.push({ ...row, classId, assignmentId, items: row.items.map((item, index) => ({
        ...item, classId, assignmentId, assignmentItemId: base.items[index].assignmentItemId
      })) })
    }
  }
  return { ...base, rows, mismatched }
}
