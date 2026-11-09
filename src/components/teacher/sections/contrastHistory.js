import { questionFingerprint } from '../../../domains/predictableErrors/probes.js'
import { evidenceProblem } from '../../../lib/evidencePredictableAnalysis.js'
import { stockholmDay } from '../../../lib/evidencePeriod.js'
import { diagnosticRequest } from './diagnosticRequest.js'

// Every screening the pupil has answered counts as seen, not only the report's
// own answers; a contrast task must be new to the pupil.
export async function screeningHistory(baseUrl) {
  const keys = new Set(), cursors = new Set(), to = stockholmDay()
  let cursor = null, revision = null
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ resource: 'evidence', source: 'screening', from: '2024-01-01', to, limit: '100', ...(cursor ? { cursor, snapshotRevision: revision } : {}) })
    const data = await call(`${baseUrl}&${params}`)
    if (data.coverage?.screening?.invalidRecords > 0) throw new Error('Delar av den indexerade screeninghistoriken saknas eller är inkonsekventa.')
    if (!Array.isArray(data.entries) || typeof data.snapshotRevision !== 'string') throw new Error('Screeninghistoriken kunde inte kontrolleras.')
    if (revision && revision !== data.snapshotRevision) throw new Error('Screeninghistoriken ändrades under hämtningen.')
    revision = data.snapshotRevision
    data.entries.forEach(entry => keys.add(questionFingerprint(evidenceProblem(entry))))
    if (data.nextCursor === null) return keys
    if (typeof data.nextCursor !== 'string' || !data.nextCursor || cursors.has(data.nextCursor)) break
    cursors.add(data.nextCursor)
    cursor = data.nextCursor
  }
  throw new Error('Elevens screeninghistorik är för lång för att kontrolleras här.')
}

export async function call(url, body) {
  const result = await diagnosticRequest(url, body ? { method: 'POST', body: JSON.stringify(body) } : {})
  if (!result.ok) throw new Error(result.data.error || 'Åtgärden kunde inte bekräftas. Inget har delats ut.')
  return result.data
}

