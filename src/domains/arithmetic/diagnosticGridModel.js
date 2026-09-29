export const DIAGNOSTIC_GRID_VERSION = 1
export const GRID_ROWS = 8
export const GRID_COLUMNS = 12

const MAIN_CHARACTERS = /^[0-9+−,─]$/u
const NOTE_CHARACTERS = /^[0-9]$/u
const EVENT_TYPES = new Set(['write', 'erase', 'move', 'layer', 'answer_change', 'pause', 'resume', 'focus_lost', 'submit'])

function isValidPosition(value, rows, columns) {
  return Number.isInteger(value?.row) && value.row >= 0 && value.row < rows
    && Number.isInteger(value?.column) && value.column >= 0 && value.column < columns
}

function cellKey(position) {
  return `${position.row}:${position.column}`
}

function normalizeCharacter(value, layer) {
  const character = value === '-' ? '−' : String(value ?? '')
  const allowed = layer === 'note' ? NOTE_CHARACTERS : MAIN_CHARACTERS
  if (!allowed.test(character)) throw new Error('Unsupported grid character')
  return character
}

export function createDiagnosticGrid({ attemptId, taskId, taskVersion, rows = GRID_ROWS, columns = GRID_COLUMNS }) {
  if (!attemptId || !taskId || !Number.isInteger(taskVersion) || taskVersion < 1) {
    throw new Error('A versioned task and attempt ID are required')
  }
  if (!Number.isInteger(rows) || rows < 1 || rows > 24
    || !Number.isInteger(columns) || columns < 1 || columns > 24) {
    throw new Error('Invalid grid dimensions')
  }
  return {
    version: DIAGNOSTIC_GRID_VERSION,
    attemptId,
    taskId,
    taskVersion,
    rows,
    columns,
    cells: {},
    answer: '',
    cursor: { row: 0, column: 0, layer: 'main' },
    status: 'in_progress',
    events: []
  }
}

export function applyDiagnosticGridEvent(state, event) {
  if (!state || state.version !== DIAGNOSTIC_GRID_VERSION || !event || !EVENT_TYPES.has(event.type)) {
    throw new Error('Invalid grid event')
  }
  if (state.status === 'submitted') throw new Error('A submitted grid is immutable')
  if (event.attemptId !== state.attemptId
    || event.sequence !== state.events.length + 1
    || event.eventId !== `${state.attemptId}:${event.sequence}`
    || !Number.isFinite(event.timestamp) || event.timestamp <= 0) {
    throw new Error('Grid event identity or order is invalid')
  }

  const next = { ...state, events: [...state.events, event] }
  if (event.type === 'write' || event.type === 'erase') {
    if (!isValidPosition(event.position, state.rows, state.columns)
      || !['main', 'note'].includes(event.layer)) throw new Error('Invalid cell or layer')
    const key = cellKey(event.position)
    const previous = state.cells[key] || { main: '', note: '' }
    if (event.before !== previous[event.layer]) throw new Error('Cell history mismatch')
    const after = event.type === 'erase' ? '' : normalizeCharacter(event.after, event.layer)
    const changed = { ...previous, [event.layer]: after }
    next.cells = { ...state.cells }
    if (changed.main || changed.note) next.cells[key] = changed
    else delete next.cells[key]
  } else if (event.type === 'move') {
    if (!isValidPosition(event.to, state.rows, state.columns)
      || !isValidPosition(event.from, state.rows, state.columns)
      || event.from.row !== state.cursor.row
      || event.from.column !== state.cursor.column) throw new Error('Cursor history mismatch')
    next.cursor = { ...state.cursor, ...event.to }
  } else if (event.type === 'layer') {
    if (!['main', 'note'].includes(event.to) || event.from !== state.cursor.layer) {
      throw new Error('Layer history mismatch')
    }
    next.cursor = { ...state.cursor, layer: event.to }
  } else if (event.type === 'answer_change') {
    if (event.before !== state.answer || typeof event.after !== 'string'
      || !/^[−-]?\d{0,12}$/u.test(event.after)) throw new Error('Answer history mismatch')
    next.answer = event.after
  } else if (event.type === 'submit') {
    next.status = 'submitted'
  }
  return next
}

export function recordDiagnosticGridEvent(state, action, timestamp = Date.now()) {
  const event = {
    ...action,
    eventId: `${state.attemptId}:${state.events.length + 1}`,
    attemptId: state.attemptId,
    sequence: state.events.length + 1,
    timestamp
  }
  return applyDiagnosticGridEvent(state, event)
}

export function replayDiagnosticGrid(snapshot) {
  if (snapshot?.version !== DIAGNOSTIC_GRID_VERSION) throw new Error('Unsupported grid version')
  const initial = createDiagnosticGrid({
    attemptId: snapshot?.attemptId,
    taskId: snapshot?.taskId,
    taskVersion: snapshot?.taskVersion,
    rows: snapshot?.rows,
    columns: snapshot?.columns
  })
  const events = snapshot?.events
  if (!Array.isArray(events)) throw new Error('Missing grid event stream')
  const replayed = events.reduce(applyDiagnosticGridEvent, initial)
  if (JSON.stringify(replayed.cells) !== JSON.stringify(snapshot.cells)
    || replayed.answer !== snapshot.answer
    || JSON.stringify(replayed.cursor) !== JSON.stringify(snapshot.cursor)
    || replayed.status !== snapshot.status) {
    throw new Error('Grid snapshot does not match its event stream')
  }
  return replayed
}
