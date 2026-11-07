import { diagnosticRequest } from './diagnosticRequest'

export const isArchivedCollection = collection => collection.members.every(member => member.archivedAt)

const patch = (request, body) => request('/api/teacher-diagnostic-assignments', { method: 'PATCH', body: JSON.stringify(body) })

// One handed-out screening can span several classes; every class part gets the
// same action. Archiving and deleting first stop an active part, which hands in
// pupils' started answers exactly as Avsluta does.
export async function runCollectionAction(collection, action, request = diagnosticRequest) {
  for (const member of collection.members) {
    const target = { classId: member.classId, assignmentId: member.assignmentId }
    if (action !== 'unarchive' && member.status === 'active') {
      const stopped = await patch(request, { ...target, status: 'stopped' })
      if (!stopped.ok) throw new Error(stopped.data.error || 'Kunde inte avsluta screeningen.')
    }
    if (action === 'stop') continue
    const result = await patch(request, { ...target, action })
    if (!result.ok) throw new Error(result.data.error || 'Servern svarade inte som väntat.')
  }
}

// Runs one item at a time and reports every item, so a failure leaves the rest done
// and the failed ones can be tried again.
export async function runBulk(items, run) {
  const results = []
  for (const item of items) {
    try { await run(item); results.push({ id: item.id, title: item.title, ok: true }) }
    catch (error) { results.push({ id: item.id, title: item.title, ok: false, error: error.message || 'Kunde inte nå servern.' }) }
  }
  return results
}

export function bulkReceipt(results, done) {
  const failed = results.filter(item => !item.ok)
  const okCount = results.length - failed.length
  const parts = []
  if (okCount) parts.push(`${okCount} ${done}.`)
  if (failed.length) parts.push(`Misslyckades: ${failed.map(item => `${item.title} (${item.error})`).join(', ')}. De är fortfarande markerade så att du kan försöka igen.`)
  return parts.join(' ')
}
