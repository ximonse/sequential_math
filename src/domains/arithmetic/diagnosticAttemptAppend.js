import { applyDiagnosticGridEvent, replayDiagnosticGrid } from './diagnosticGridModel.js'

export const MAX_DIAGNOSTIC_APPEND_BYTES = 32 * 1024
export const MAX_DIAGNOSTIC_ATTEMPT_EVENTS = 1024
export const MAX_DIAGNOSTIC_ATTEMPT_BYTES = 512 * 1024

const encoder = new TextEncoder()
const COMMON_EVENT_FIELDS = ['type', 'eventId', 'attemptId', 'sequence', 'timestamp']
const EVENT_FIELDS = {
  write: ['position', 'layer', 'before', 'after'],
  erase: ['position', 'layer', 'before', 'after'],
  move: ['from', 'to'],
  layer: ['from', 'to'],
  reclassify: ['position', 'from', 'to', 'value'],
  cross_out: ['position', 'before', 'after'],
  line_add: ['axis', 'from', 'to', 'placement'],
  line_remove: ['lineId'],
  answer_change: ['before', 'after'],
  drawing_stroke: ['points', 'erasing', 'color'],
  drawing_clear: [],
  pause: [],
  resume: [],
  focus_lost: [],
  submit: []
}

function jsonBytes(value) {
  try { return encoder.encode(JSON.stringify(value)).length } catch { return Number.POSITIVE_INFINITY }
}

// Leave room for one final UI event so the pupil sees a clear full state
// before a subsequent action could be rejected by the server quota.
export function isDiagnosticAttemptFull(events) {
  return events.length >= MAX_DIAGNOSTIC_ATTEMPT_EVENTS
    || jsonBytes(events) >= MAX_DIAGNOSTIC_ATTEMPT_BYTES - 1024
}

export function exceedsDiagnosticAttemptQuota(events) {
  const finalSubmission = events.length === MAX_DIAGNOSTIC_ATTEMPT_EVENTS + 1 && events.at(-1)?.type === 'submit'
  return (events.length > MAX_DIAGNOSTIC_ATTEMPT_EVENTS && !finalSubmission)
    || jsonBytes(events) > MAX_DIAGNOSTIC_ATTEMPT_BYTES
}

function hasOnlyCoordinates(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === 2
    && Object.hasOwn(value, 'row') && Object.hasOwn(value, 'column')
}

function hasValidPositionShape(event) {
  if (['write', 'erase', 'reclassify', 'cross_out'].includes(event.type)) {
    return hasOnlyCoordinates(event.position)
  }
  if (event.type === 'move' || event.type === 'line_add') {
    return hasOnlyCoordinates(event.from) && hasOnlyCoordinates(event.to)
  }
  return true
}

export class DiagnosticAppendError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'DiagnosticAppendError'
    this.status = status
    this.code = code
  }
}

function conflict(message) {
  throw new DiagnosticAppendError(409, 'revision_conflict', message)
}

/**
 * Validate one append against the exact server snapshot before a storage CAS.
 * The caller must authenticate and authorize the attempt independently. This
 * function never changes its inputs and never treats a timestamp as ordering.
 */
export function prepareDiagnosticAppend({ snapshot, serverRevision, expectedRevision, events }) {
  if (!Number.isInteger(serverRevision) || serverRevision < 0
    || !Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw new DiagnosticAppendError(400, 'invalid_revision', 'Invalid diagnostic revision')
  }
  if (!Array.isArray(events) || events.length < 1 || events.length > 100) {
    throw new DiagnosticAppendError(400, 'invalid_batch', 'Invalid diagnostic event batch')
  }
  if (jsonBytes(events) > MAX_DIAGNOSTIC_APPEND_BYTES) {
    throw new DiagnosticAppendError(413, 'batch_too_large', 'Diagnostic event batch is too large')
  }
  if (events.some(event => !event || typeof event !== 'object' || Array.isArray(event)
    || !Object.hasOwn(EVENT_FIELDS, event.type)
    || Object.keys(event).some(key => !COMMON_EVENT_FIELDS.includes(key)
      && !EVENT_FIELDS[event.type].includes(key))
    || !hasValidPositionShape(event))) {
    throw new DiagnosticAppendError(400, 'invalid_event', 'Diagnostic event contains unsupported fields')
  }

  let current
  try { current = replayDiagnosticGrid(snapshot) } catch {
    throw new DiagnosticAppendError(409, 'corrupt_snapshot', 'Saved diagnostic grid cannot be replayed')
  }

  const firstSequence = events[0]?.sequence
  if (expectedRevision !== serverRevision) {
    if (expectedRevision < serverRevision && Number.isInteger(firstSequence) && firstSequence >= 1) {
      const saved = current.events.slice(firstSequence - 1, firstSequence - 1 + events.length)
      if (saved.length === events.length
        && saved.every((event, index) => JSON.stringify(event) === JSON.stringify(events[index]))) {
        return { kind: 'duplicate', snapshot: current, serverRevision,
          ack: events.map(event => event.eventId) }
      }
    }
    conflict('Diagnostic attempt changed on another device')
  }

  if (current.status === 'submitted') conflict('Submitted diagnostic attempt is immutable')
  if (exceedsDiagnosticAttemptQuota([...current.events, ...events])) {
    throw new DiagnosticAppendError(413, 'attempt_too_large', 'Diagnostic attempt is full')
  }

  let next = current
  try {
    for (const event of events) next = applyDiagnosticGridEvent(next, event)
  } catch {
    conflict('Diagnostic event order or cell history is invalid')
  }
  return { kind: 'append', snapshot: next, serverRevision: serverRevision + 1,
    ack: events.map(event => event.eventId) }
}
