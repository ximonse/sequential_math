export const DIAGNOSTIC_GRID_VERSION = 1
export const GRID_ROWS = 8
export const GRID_COLUMNS = 12

const MAIN_CHARACTERS = /^[0-9+−×/÷,─]$/u
const NOTE_CHARACTERS = /^[0-9]{1,2}$/u
const EVENT_TYPES = new Set(['write', 'erase', 'move', 'layer', 'reclassify', 'cross_out', 'line_add', 'line_remove', 'answer_change', 'drawing_stroke', 'pause', 'resume', 'focus_lost', 'submit'])

function isValidPosition(value, rows, columns) {
  return Number.isInteger(value?.row) && value.row >= 0 && value.row < rows
    && Number.isInteger(value?.column) && value.column >= 0 && value.column < columns
}

function cellKey(position) {
  return `${position.row}:${position.column}`
}

function normalizeCharacter(value, layer) {
  const character = value === '-' ? '−' : value === '*' ? '×' : String(value ?? '')
  const allowed = layer === 'note' ? NOTE_CHARACTERS : MAIN_CHARACTERS
  if (!allowed.test(character)) throw new Error('Unsupported grid character')
  return character
}

export function createDiagnosticGrid({ attemptId, taskId, taskVersion, rows = GRID_ROWS, columns = GRID_COLUMNS, answerType = 'number' }) {
  if (!attemptId || !taskId || !Number.isInteger(taskVersion) || taskVersion < 1) {
    throw new Error('A versioned task and attempt ID are required')
  }
  if (!Number.isInteger(rows) || rows < 1 || rows > 24
    || !Number.isInteger(columns) || columns < 1 || columns > 24) {
    throw new Error('Invalid grid dimensions')
  }
  if (!['number', 'text'].includes(answerType)) throw new Error('Invalid diagnostic answer type')
  return {
    version: DIAGNOSTIC_GRID_VERSION,
    attemptId,
    taskId,
    taskVersion,
    rows,
    columns,
    cells: {},
    lines: [],
    ...(answerType === 'text' ? { answerType } : {}),
    drawing: [],
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
    const after = event.type === 'erase' ? (event.after ?? '') : normalizeCharacter(event.after, event.layer)
    if (event.type === 'erase' && after !== ''
      && !(event.layer === 'note' && after === previous.note.slice(0, -1))) {
      throw new Error('Invalid grid erasure')
    }
    const changed = { ...previous, [event.layer]: after }
    next.cells = { ...state.cells }
    if (changed.main || changed.note) next.cells[key] = changed
    else delete next.cells[key]
  } else if (event.type === 'reclassify') {
    if (!isValidPosition(event.position, state.rows, state.columns)
      || !['main', 'note'].includes(event.from)
      || !['main', 'note'].includes(event.to)
      || event.from === event.to) throw new Error('Invalid digit conversion')
    const key = cellKey(event.position)
    const previous = state.cells[key]
    if (!previous || !/^[0-9]{1,2}$/u.test(previous[event.from])
      || previous[event.to] || event.value !== previous[event.from]) {
      throw new Error('Digit conversion history mismatch')
    }
    next.cells = { ...state.cells, [key]: { ...previous, [event.from]: '', [event.to]: event.value } }
    if (state.cursor.row === event.position.row && state.cursor.column === event.position.column) {
      next.cursor = { ...state.cursor, layer: event.to }
    }
  } else if (event.type === 'cross_out') {
    if (!isValidPosition(event.position, state.rows, state.columns)) throw new Error('Invalid crossed-out cell')
    const key = cellKey(event.position)
    const previous = state.cells[key]
    if (!previous || !/^[0-9]{1,2}$/u.test(previous.main || previous.note)
      || event.before !== Boolean(previous.struck)
      || event.after !== !event.before) throw new Error('Cross-out history mismatch')
    const changed = { ...previous }
    if (event.after) changed.struck = true
    else delete changed.struck
    next.cells = { ...state.cells, [key]: changed }
  } else if (event.type === 'line_add') {
    if (!['horizontal', 'vertical'].includes(event.axis)
      || !isValidPosition(event.from, state.rows, state.columns)
      || !isValidPosition(event.to, state.rows, state.columns)
      || (event.axis === 'horizontal' && (event.from.row !== event.to.row || event.from.column > event.to.column))
      || (event.axis === 'vertical' && (event.from.column !== event.to.column || event.from.row > event.to.row))) {
      throw new Error('Invalid grid line')
    }
    if (event.placement !== undefined && event.placement !== 'grid-border') throw new Error('Invalid line placement')
    next.lines = [...(state.lines || []), { id: event.eventId, axis: event.axis,
      ...(event.placement ? { placement: event.placement } : {}),
      from: event.from, to: event.to }]
  } else if (event.type === 'line_remove') {
    const lines = state.lines || []
    if (typeof event.lineId !== 'string' || !lines.some(line => line.id === event.lineId)) {
      throw new Error('Invalid grid line removal')
    }
    next.lines = lines.filter(line => line.id !== event.lineId)
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
      || (state.answerType === 'text' ? event.after.length > 2000 : !/^[−-]?\d{0,12}$/u.test(event.after))) throw new Error('Answer history mismatch')
    next.answer = event.after
  } else if (event.type === 'drawing_stroke') {
    if (!Array.isArray(event.points) || event.points.length < 1 || event.points.length > 200
      || typeof event.erasing !== 'boolean'
      || event.points.some(point => !Array.isArray(point) || point.length !== 2
        || point.some(value => !Number.isFinite(value) || value < 0 || value > 1))) {
      throw new Error('Invalid drawing stroke')
    }
    next.drawing = [...(state.drawing || []), { points: event.points, erasing: event.erasing }]
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
    columns: snapshot?.columns,
    answerType: snapshot?.answerType || 'number'
  })
  const events = snapshot?.events
  if (!Array.isArray(events)) throw new Error('Missing grid event stream')
  const replayed = events.reduce(applyDiagnosticGridEvent, initial)
  if (JSON.stringify(replayed.cells) !== JSON.stringify(snapshot.cells)
    || JSON.stringify(replayed.lines) !== JSON.stringify(snapshot.lines ?? [])
    || JSON.stringify(replayed.drawing) !== JSON.stringify(snapshot.drawing ?? [])
    || replayed.answer !== snapshot.answer
    || JSON.stringify(replayed.cursor) !== JSON.stringify(snapshot.cursor)
    || replayed.status !== snapshot.status) {
    throw new Error('Grid snapshot does not match its event stream')
  }
  return replayed
}
