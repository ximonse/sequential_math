import { stockholmDay } from './evidencePeriod.js'

// Read the entire fixed evidence window. Never silently interpret a truncated
// history, or join pages from different revisions into one result.
export async function readFollowUpAnswers({ request, studentId, classId, assignmentId }) {
  const base = `/api/teacher-students/${encodeURIComponent(studentId)}?classId=${encodeURIComponent(classId)}`
  const found = [], cursors = new Set(), to = stockholmDay()
  let cursor = null, revision = null
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ resource: 'evidence', source: 'screening', from: '2024-01-01', to, limit: '100',
      ...(cursor ? { cursor, snapshotRevision: revision } : {}) })
    const result = await request(`${base}&${params}`)
    if (!result.ok) throw new Error(result.data.error || 'Svaren kunde inte hämtas.')
    const data = result.data
    if (!Array.isArray(data.entries) || typeof data.snapshotRevision !== 'string') throw new Error('Svarsunderlaget kunde inte kontrolleras.')
    if (revision && data.snapshotRevision !== revision) throw new Error('Underlaget har ändrats. Hämta svaren igen.')
    revision = data.snapshotRevision
    found.push(...data.entries.filter(entry => entry.reference?.assignmentId === assignmentId))
    if (data.nextCursor === null) return found
    if (typeof data.nextCursor !== 'string' || !data.nextCursor || cursors.has(data.nextCursor)) break
    cursors.add(data.nextCursor)
    cursor = data.nextCursor
  }
  throw new Error('Historiken kunde inte läsas fullständigt. Inget sammanfattande resultat visas. Försök hämta svaren igen.')
}

const identity = task => task && typeof task.taskId === 'string' && Number.isInteger(task.taskVersion)
  ? JSON.stringify([task.taskId, task.taskVersion]) : null

// Expected tasks come from the stored material version, never an edited preview.
export function followUpProgress(entries, items) {
  const known = Array.isArray(items) && items.length > 0 && items.every(item => identity(item.task))
  const expected = known ? items.length : null
  const remaining = new Map(), itemIds = new Set()
  if (known) for (const item of items) {
    const key = identity(item.task)
    remaining.set(key, (remaining.get(key) || 0) + 1)
  }
  let consistent = known, assessed = 0
  for (const entry of entries) {
    const key = identity(entry.question), itemId = entry.reference?.assignmentItemId
    if (!key || !itemId || itemIds.has(itemId) || !(remaining.get(key) > 0)) consistent = false
    else {
      itemIds.add(itemId)
      remaining.set(key, remaining.get(key) - 1)
      if (['correct', 'incorrect'].includes(entry.answer.status)) assessed++
    }
  }
  const submitted = entries.length > 0 && entries.every(entry => entry.answer.submitted === true)
  return { expected, assessed, pending: known ? Math.max(0, expected - assessed) : null, consistent,
    submitted, complete: Boolean(consistent && entries.length === expected && assessed === expected && submitted) }
}
