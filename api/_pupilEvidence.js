import { practiceObservation } from '../src/lib/practiceObservation.js'
import { teacherPracticeRows } from '../src/lib/teacherPracticeRows.js'
import { createHash } from 'node:crypto'
import { addPredictableEvidence } from '../src/lib/evidencePredictableAnalysis.js'

export const evidenceError = (status, code, message) => Object.assign(new Error(message), { status, code })
export const evidenceHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export const evidencePick = (value, keys) => Object.fromEntries(keys.filter(key => value?.[key] !== undefined)
  .map(key => [key, value[key]]))

export function practiceEvidence(profile) {
  const { source, entries: rows, storedRecords, duplicates, invalidTimestamps, warnings } = teacherPracticeRows(profile)
  const entries = []
  for (const { value, id, position } of rows) {
    const digest = evidenceHash(value)
    entries.push({ source: 'practice', timestamp: value.timestamp, timeBasis: 'answer_timestamp',
      reference: { kind: id ? 'observation' : 'legacy_position', observationId: id,
        collection: source, position, revision: digest },
      ...practiceObservation(value) })
  }
  const timestamps = entries.map(entry => entry.timestamp)
  return { entries, coverage: { source, completeness: 'unknown', storedRecords,
    duplicateRecords: duplicates, invalidTimestamps,
    earliestAvailable: timestamps.length ? Math.min(...timestamps) : null,
    latestAvailable: timestamps.length ? Math.max(...timestamps) : null, warnings: [...warnings] } }
}

export function evidencePage({ studentId, classId, period, source, practice, screening, query, unpaged = false }) {
  const all = [...practice.entries, ...screening.entries]
    .filter(entry => entry.timestamp >= period.startInclusive && entry.timestamp < period.endExclusive)
    .sort((a, b) => a.timestamp - b.timestamp || JSON.stringify(a.reference).localeCompare(JSON.stringify(b.reference)))
  // Teacher review metadata is a separate versioned layer, not an edit to the
  // original answer. Changing a review must not invalidate its source refs.
  const sourceEntries = all.map(({ teacherReview: _review, ...entry }) => entry)
  const revision = evidenceHash({ studentId, classId, period, source, all: sourceEntries,
    coverage: { practice: practice.coverage, screening: screening.coverage } })
  if (query.snapshotRevision && query.snapshotRevision !== revision) {
    throw evidenceError(409, 'evidence_changed', 'Underlaget har ändrats. Börja om från första sidan.')
  }
  // A legacy position is only meaningful within this exact snapshot.
  // A new rule version must not invalidate unchanged original-source references;
  // rule candidates carry their own version and are validated separately.
  const entries = addPredictableEvidence(all.map(entry => ({ ...entry, ref: evidenceHash({ revision, reference: entry.reference }) })))
  if (query.ref) {
    if (!query.snapshotRevision) throw evidenceError(400, 'snapshot_required', 'Detaljläsning kräver snapshotRevision.')
    const entry = entries.find(item => item.ref === query.ref)
    if (!entry) throw evidenceError(404, 'evidence_not_found', 'Referensen finns inte i detta underlag.')
    return { schemaVersion: 1, studentId, classId, source, period, snapshotRevision: revision, entry }
  }
  let offset = 0
  if (query.cursor) {
    const match = /^([a-f0-9]{64}):(\d+)$/u.exec(query.cursor)
    if (!match) throw evidenceError(400, 'invalid_cursor', 'Ogiltig sidreferens.')
    if (match[1] !== revision) throw evidenceError(409, 'evidence_changed', 'Underlaget har ändrats. Börja om från första sidan.')
    offset = Number(match[2])
    if (!Number.isSafeInteger(offset) || offset > entries.length) throw evidenceError(400, 'invalid_cursor', 'Ogiltig sidreferens.')
  }
  const limit = query.limit === undefined ? 50 : Number(query.limit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw evidenceError(400, 'invalid_limit', 'Sidstorlek ska vara 1–100.')
  // Workspaces/events are only returned by an explicit, revision-checked detail read.
  const page = (unpaged ? entries : entries.slice(offset, offset + limit)).map(({ detail: _detail, ...entry }) => entry)
  return { schemaVersion: 1, studentId, classId, source, period, snapshotRevision: revision,
    coverage: { practice: practice.coverage, screening: screening.coverage }, total: entries.length,
    entries: page, nextCursor: !unpaged && offset + limit < entries.length ? `${revision}:${offset + limit}` : null }
}
