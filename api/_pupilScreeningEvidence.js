import { kv } from '@vercel/kv'
import { readDiagnosticAttempt } from './_diagnosticAttemptStore.js'
import { summarizeDiagnosticObservation } from '../src/domains/arithmetic/diagnosticObservation.js'
import { identifyDiagnosticObservationRevision } from '../src/domains/arithmetic/diagnosticObservationRevision.js'
import { evidenceError, evidencePick } from './_pupilEvidence.js'

const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(id)

export async function pupilScreeningEvidence(studentId, classId, { store = kv, read = readDiagnosticAttempt } = {}) {
  const ids = await store.smembers(`diagnostic_attempts_by_student:${studentId}`) || []
  if (ids.length > 1000) throw evidenceError(413, 'screening_read_limit', 'För många screeningförsök för denna läsning.')
  const entries = [], warnings = new Set(['assignment_index_completeness_unknown'])
  let invalidRecords = 0
  for (const id of [...new Set(ids)]) {
    if (!validId(id)) { invalidRecords++; continue }
    const record = await store.get(`diagnostic_attempt:${id}`)
    if (!record) { invalidRecords++; continue }
    if (record.studentId !== studentId || record.classIdAtAttempt !== classId) continue
    if (record.evidenceClass !== 'diagnostic_only' || !validId(record.assignmentId)) { invalidRecords++; continue }
    const assignment = await store.get(`diagnostic_assignment:${record.assignmentId}`)
    const item = assignment?.items?.find(candidate => candidate.assignmentItemId === record.assignmentItemId
      && candidate.taskId === record.taskId && candidate.taskVersion === record.taskVersion)
    if (!item || assignment.classId !== classId || assignment.evidenceClass !== 'diagnostic_only'
      || !assignment.studentIds?.includes(studentId)) { invalidRecords++; continue }
    const saved = await read(id, { store })
    const current = saved?.record
    if (!current || ['studentId', 'classIdAtAttempt', 'assignmentId', 'assignmentItemId', 'taskId', 'taskVersion', 'evidenceClass']
      .some(key => current[key] !== record[key])) throw evidenceError(409, 'evidence_changed', 'Screeningförsöket ändrades under läsningen.')
    const revision = identifyDiagnosticObservationRevision(current, saved.snapshot)
    const observation = summarizeDiagnosticObservation(item.taskSnapshot, saved.snapshot)
    // Saved client times describe activity, not trusted server acceptance times.
    const times = saved.snapshot.events.map(event => event.timestamp).filter(time => Number.isFinite(time) && time > 0)
    const timestamp = times.length ? Math.max(...times) : current.createdAt
    if (!Number.isFinite(timestamp) || timestamp <= 0) { invalidRecords++; continue }
    entries.push({ source: 'screening', timestamp,
      timeBasis: times.length ? 'latest_saved_client_event' : 'attempt_created_at',
      reference: { kind: 'screening_attempt', attemptId: id, assignmentId: record.assignmentId,
        assignmentItemId: record.assignmentItemId, ...revision },
      question: evidencePick(item.taskSnapshot, ['taskId', 'taskVersion', 'promptSv', 'operation', 'operands',
        'answerType', 'responseMode', 'images', 'options']),
      answer: { status: observation.answerStatus, studentAnswer: observation.explicitAnswer,
        correctAnswer: observation.expectedAnswer, submitted: observation.submitted,
        ...evidencePick(observation, ['selectedOptionIds', 'correctSelections', 'missedOptions', 'incorrectSelections']) },
      context: { evidenceClass: 'diagnostic_only', classIdAtAttempt: classId, status: current.status,
        createdAt: current.createdAt, timeQuality: times.length ? 'client_reported' : 'server_created' },
      interpretation: { category: 'unknown', patterns: [], detail: null },
      detail: { snapshot: saved.snapshot, observation } })
  }
  if (invalidRecords) warnings.add('missing_or_inconsistent_records')
  return { entries, coverage: { completeness: 'unknown', indexedAttempts: ids.length,
    invalidRecords, periodBasis: 'latest_saved_activity_per_attempt', warnings: [...warnings] } }
}
