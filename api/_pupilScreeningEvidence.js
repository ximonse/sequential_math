import { kv } from '@vercel/kv'
import { readDiagnosticAttempt } from './_diagnosticAttemptStore.js'
import { summarizeDiagnosticObservation } from '../src/domains/arithmetic/diagnosticObservation.js'
import { identifyDiagnosticObservationRevision } from '../src/domains/arithmetic/diagnosticObservationRevision.js'
import { evidenceError, evidencePick } from './_pupilEvidence.js'
import { diagnosticNotebookStatus } from '../src/domains/arithmetic/diagnosticNotebookExport.js'

const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(id)

export async function pupilScreeningEvidence(studentId, classId, { store = kv, read = readDiagnosticAttempt } = {}) {
  const ids = await store.smembers(`diagnostic_attempts_by_student:${studentId}`) || []
  if (ids.length > 1000) throw evidenceError(413, 'screening_read_limit', 'För många screeningförsök för denna läsning.')
  const entries = [], warnings = new Set(['assignment_index_completeness_unknown'])
  let invalidRecords = 0
  async function readEntry(id) {
    if (!validId(id)) { invalidRecords++; return null }
    const record = await store.get(`diagnostic_attempt:${id}`)
    if (!record) { invalidRecords++; return null }
    if (record.studentId !== studentId || record.classIdAtAttempt !== classId) return null
    if (record.evidenceClass !== 'diagnostic_only' || !validId(record.assignmentId)) { invalidRecords++; return null }
    const assignment = await store.get(`diagnostic_assignment:${record.assignmentId}`)
    const item = assignment?.items?.find(candidate => candidate.assignmentItemId === record.assignmentItemId
      && candidate.taskId === record.taskId && candidate.taskVersion === record.taskVersion)
    if (!item || assignment.classId !== classId || assignment.evidenceClass !== 'diagnostic_only'
      || !assignment.studentIds?.includes(studentId)) { invalidRecords++; return null }
    const saved = await read(id, { store })
    const current = saved?.record
    if (!current || ['studentId', 'classIdAtAttempt', 'assignmentId', 'assignmentItemId', 'taskId', 'taskVersion', 'evidenceClass']
      .some(key => current[key] !== record[key])) throw evidenceError(409, 'evidence_changed', 'Screeningförsöket ändrades under läsningen.')
    const revision = identifyDiagnosticObservationRevision(current, saved.snapshot)
    const observation = summarizeDiagnosticObservation(item.taskSnapshot, saved.snapshot)
    // Saved client times describe activity, not trusted server acceptance times.
    const times = saved.snapshot.events.map(event => event.timestamp).filter(time => Number.isFinite(time) && time > 0)
    const timestamp = times.length ? Math.max(...times) : current.createdAt
    if (!Number.isFinite(timestamp) || timestamp <= 0) { invalidRecords++; return null }
    const review = await store.get(`diagnostic_review:${id}`)
    const teacherReview = review?.studentId === studentId ? {
      reviewRevision: review.reviewRevision, evidenceRevision: review.evidenceRevision, evidenceSequence: review.evidenceSequence,
      matchesEvidence: review.evidenceRevision === current.serverRevision && review.evidenceSequence === current.lastSequence,
      reviewed: review.reviewed === true, noteSv: review.note || '', updatedAt: review.updatedAt } : null
    return { source: 'screening', timestamp,
      timeBasis: times.length ? 'latest_saved_client_event' : 'attempt_created_at',
      reference: { kind: 'screening_attempt', attemptId: id, assignmentId: record.assignmentId,
        assignmentItemId: record.assignmentItemId, ...revision },
      question: evidencePick(item.taskSnapshot, ['taskId', 'taskVersion', 'promptSv', 'operation', 'operands', 'domain', 'values',
        'answerType', 'responseMode', 'images', 'options', 'gridEnabled', 'drawingEnabled', 'correctOptionIds']),
      answer: { status: observation.answerStatus, studentAnswer: observation.explicitAnswer,
        correctAnswer: observation.expectedAnswer, submitted: observation.submitted,
        ...diagnosticNotebookStatus(saved.snapshot, item.taskSnapshot),
        ...evidencePick(observation, ['selectedOptionIds', 'correctSelections', 'missedOptions', 'incorrectSelections']) },
      context: { evidenceClass: 'diagnostic_only', classIdAtAttempt: classId, status: current.status,
        createdAt: current.createdAt, timeQuality: times.length ? 'client_reported' : 'server_created' },
      interpretation: { category: 'unknown', patterns: [], detail: null },
      ...(teacherReview ? { teacherReview } : {}),
      detail: { snapshot: saved.snapshot, observation } }
  }
  // Keep every original-work/revision check. Independent attempts do not need
  // to wait for one another's network round trips; bound load and preserve order.
  const uniqueIds = [...new Set(ids)]
  for (let start = 0; start < uniqueIds.length; start += 8) {
    entries.push(...(await Promise.all(uniqueIds.slice(start, start + 8).map(readEntry))).filter(Boolean))
  }
  if (invalidRecords) warnings.add('missing_or_inconsistent_records')
  return { entries, coverage: { completeness: 'unknown', indexedAttempts: ids.length,
    invalidRecords, periodBasis: 'latest_saved_activity_per_attempt', warnings: [...warnings] } }
}
