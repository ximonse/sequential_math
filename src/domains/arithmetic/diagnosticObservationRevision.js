import { replayDiagnosticGrid } from './diagnosticGridModel.js'

export const DIAGNOSTIC_OBSERVATION_REVISION_SCHEME = 1

// Server revision and event sequence identify one immutable saved snapshot.
// This is not an analysis revision: current analysis is recomputed on read.
export function identifyDiagnosticObservationRevision(record, snapshot) {
  const grid = replayDiagnosticGrid(snapshot)
  if (record?.evidenceClass !== 'diagnostic_only'
    || !/^[A-Za-z0-9_-]{1,128}$/u.test(record.attemptId || '')
    || record.attemptId !== grid.attemptId
    || record.taskId !== grid.taskId
    || record.taskVersion !== grid.taskVersion
    || record.status !== grid.status
    || !Number.isSafeInteger(record.serverRevision) || record.serverRevision < 0
    || !Number.isSafeInteger(record.lastSequence) || record.lastSequence !== grid.events.length) {
    throw new Error('Diagnostic observation revision does not match saved attempt')
  }
  return {
    schemeVersion: DIAGNOSTIC_OBSERVATION_REVISION_SCHEME,
    observationRevisionId: `${record.attemptId}:r${record.serverRevision}:s${record.lastSequence}`,
    serverRevision: record.serverRevision,
    lastSequence: record.lastSequence
  }
}
