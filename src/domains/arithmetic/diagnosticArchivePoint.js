import { summarizeDiagnosticObservation } from './diagnosticObservation.js'
import { analyzeDiagnosticColumnAlignment } from './diagnosticColumnAlignment.js'

export const DIAGNOSTIC_ARCHIVE_POINT_VERSION = 1

function monthOf(timestamp) {
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) return null
  const date = new Date(timestamp)
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 7) : null
}

// This is a proposed derived point, not the deletion/archive transaction.
// Never spread record, task, snapshot, or analysis objects into this return value.
export function createDiagnosticArchivePoint({ record, task, snapshot }) {
  if (record?.evidenceClass !== 'diagnostic_only'
    || record?.taskId !== task?.taskId || record?.taskVersion !== task?.taskVersion
    || record?.attemptId !== snapshot?.attemptId
    || !Number.isInteger(record?.serverRevision) || record.serverRevision < 0
    || record?.lastSequence !== snapshot?.events?.length
    || record?.status !== snapshot?.status) {
    throw new Error('Diagnostic archive source is inconsistent')
  }
  const observation = summarizeDiagnosticObservation(task, snapshot)
  const alignment = analyzeDiagnosticColumnAlignment(task, snapshot)
  return {
    pointVersion: DIAGNOSTIC_ARCHIVE_POINT_VERSION,
    taskId: record.taskId,
    taskVersion: record.taskVersion,
    month: monthOf(record.createdAt),
    submitted: observation.submitted,
    answerStatus: observation.answerStatus,
    hasWorkHistory: observation.hasWorkHistory,
    finalOccupiedCells: observation.finalOccupiedCells,
    columnAlignment: alignment.status === 'observed' ? alignment.alignment : 'unknown'
  }
}
