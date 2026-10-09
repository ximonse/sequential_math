import { useCallback, useEffect, useRef, useState } from 'react'
import taskManifest from '../domains/arithmetic/diagnosticTasks.v1.json'
import {
  createDiagnosticGrid,
  recordDiagnosticGridEvent,
  replayDiagnosticGrid
} from '../domains/arithmetic/diagnosticGridModel'
import { exceedsDiagnosticAttemptQuota, isDiagnosticAttemptFull } from '../domains/arithmetic/diagnosticAttemptAppend'
import DiagnosticGridLines from './DiagnosticGridLines'
import { lineTouchesPoint } from '../domains/arithmetic/diagnosticLineGeometry'
import MathScratchpad from '../components/student/MathScratchpad'
import NotebookTools from './NotebookTools'
import { MAIN_CHARACTERS, NUMBER_ANSWER } from '../domains/arithmetic/diagnosticGridModel'
import './diagnosticGridPrototype.css'

const TASKS = taskManifest.tasks
const HOLD_MS = 500
const DRAG_PX = 12

function lineBetween(from, to, horizontalOnly = false) {
  const axis = horizontalOnly || Math.abs(to.column - from.column) >= Math.abs(to.row - from.row)
    ? 'horizontal' : 'vertical'
  if (axis === 'horizontal') return { axis, placement: 'grid-border',
    from: { row: from.row, column: Math.min(from.column, to.column) },
    to: { row: from.row, column: Math.max(from.column, to.column) } }
  return { axis, placement: 'grid-border',
    from: { row: Math.min(from.row, to.row), column: from.column },
    to: { row: Math.max(from.row, to.row), column: from.column } }
}

function newGrid(task) {
  return createDiagnosticGrid({
    attemptId: `prototype:${crypto.randomUUID()}`,
    taskId: task.taskId,
    taskVersion: task.taskVersion, answerType: task.answerType || 'number'
  })
}

function DiagnosticGridPrototype({ pilot = null, onSave = null, onGridChange = null, saveState = null, workspaceOnly = false,
  onNext = null, onPrevious = null, onHome = null, onSubmitCollection = null, collectionTitle = '', questionIndex = 1, questionCount = 1 }) {
  const availableTasks = pilot ? [pilot.task] : TASKS
  const [task, setTask] = useState(pilot?.task || TASKS[0])
  const [grid, setGrid] = useState(() => pilot?.snapshot || newGrid(pilot?.task || TASKS[0]))
  const [snapshotText, setSnapshotText] = useState('')
  const [message, setMessage] = useState('')
  const gridRef = useRef(null)
  const gridsRef = useRef(new Map())
  const gestureRef = useRef(null)
  const [dragPreview, setDragPreview] = useState('')
  const [linePreview, setLinePreview] = useState(null)
  const [lineMode, setLineMode] = useState(false)
  const [eraseMode, setEraseMode] = useState(false)
  const [inputTarget, setInputTarget] = useState(pilot?.task.gridEnabled === false ? 'answer' : 'grid')
  const [contextMenu, setContextMenu] = useState(null)
  const [drawingVisible, setDrawingVisible] = useState(false)
  const [notebookVisible, setNotebookVisible] = useState(true)
  const isPilot = Boolean(pilot)
  const submitting = Boolean(saveState?.submitting)
  const editingLocked = grid.status === 'submitted' || submitting

  useEffect(() => { onGridChange?.(grid.events.length, grid) }, [grid, onGridChange])

  const record = useCallback((actionOrBuilder) => {
    if (submitting) return
    const timestamp = Date.now()
    setGrid(previous => {
      if (previous.status === 'submitted') return previous
      if (isPilot && isDiagnosticAttemptFull(previous.events)) return previous
      const action = typeof actionOrBuilder === 'function' ? actionOrBuilder(previous) : actionOrBuilder
      if (!action) return previous
      const next = recordDiagnosticGridEvent(previous, action, timestamp)
      return isPilot && exceedsDiagnosticAttemptQuota(next.events) ? previous : next
    })
  }, [isPilot, submitting])

  useEffect(() => {
    const activeElement = document.activeElement
    if (!activeElement?.classList?.contains('diagnostic-cell__input')
      && !activeElement?.classList?.contains('diagnostic-layer-button')) return
    const element = gridRef.current?.querySelector(
      `[data-cell="${grid.cursor.row}:${grid.cursor.column}"]`
    )
    element?.focus({ preventScroll: true })
  }, [grid.cursor])

  useEffect(() => {
    if (grid.status === 'submitted') return undefined
    const onBlur = () => record({ type: 'focus_lost' })
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') record({ type: 'pause' })
      else record({ type: 'resume' })
    }
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [grid.status, record])

  function chooseTask(nextTask) {
    gridsRef.current.set(task.taskId, grid)
    setTask(nextTask)
    setGrid(gridsRef.current.get(nextTask.taskId) || newGrid(nextTask))
    setSnapshotText('')
    setMessage('Uppgiften byttes. Tidigare arbete ligger kvar i den här fliken.')
  }

  function moveCursor(to) {
    record(previous => to.row === previous.cursor.row && to.column === previous.cursor.column
      ? null
      : { type: 'move', from: { row: previous.cursor.row, column: previous.cursor.column }, to })
  }

  function selectCell(row, column) {
    record(previous => {
      const current = previous.cells[`${row}:${column}`]
      const layer = current?.note ? 'note' : 'main'
      if (previous.cursor.row !== row || previous.cursor.column !== column) {
        return { type: 'move', from: { row: previous.cursor.row, column: previous.cursor.column }, to: { row, column } }
      }
      return previous.cursor.layer === layer ? null : { type: 'layer', from: previous.cursor.layer, to: layer }
    })
    record(previous => {
      const current = previous.cells[`${row}:${column}`]
      const layer = current?.note ? 'note' : 'main'
      return previous.cursor.layer === layer ? null : { type: 'layer', from: previous.cursor.layer, to: layer }
    })
  }

  function focusSelectedCell() {
    gridRef.current?.querySelector(
      `[data-cell="${grid.cursor.row}:${grid.cursor.column}"]`
    )?.focus({ preventScroll: true })
  }

  function setLayer(layer) {
    record(previous => {
      const position = { row: previous.cursor.row, column: previous.cursor.column }
      const cell = previous.cells[`${position.row}:${position.column}`]
      const from = cell?.note ? 'note' : cell?.main ? 'main' : null
      if (from && from !== layer) {
        if (!/^[0-9]{1,2}$/u.test(cell[from])) return null
        return { type: 'reclassify', position, from, to: layer, value: cell[from] }
      }
      return layer === previous.cursor.layer ? null : { type: 'layer', from: previous.cursor.layer, to: layer }
    })
  }

  function toggleCrossOut(position = grid.cursor) {
    record(previous => {
      const cell = previous.cells[`${position.row}:${position.column}`]
      if (!/^[0-9]{1,2}$/u.test(cell?.main || cell?.note || '')) return null
      return { type: 'cross_out', position: { row: position.row, column: position.column },
        before: Boolean(cell.struck), after: !cell.struck }
    })
  }

  function stopGesture() {
    const gesture = gestureRef.current
    if (gesture?.timer) window.clearTimeout(gesture.timer)
    gestureRef.current = null
    setDragPreview('')
    setLinePreview(null)
  }

  function cellAtPoint(x, y) {
    const bounds = gridRef.current?.getBoundingClientRect()
    if (!bounds) return null
    return { row: Math.max(0, Math.min(grid.rows - 1,
      Math.floor((y - bounds.top) / (bounds.height / grid.rows)))),
    column: Math.max(0, Math.min(grid.columns - 1,
      Math.floor((x - bounds.left) / (bounds.width / grid.columns)))) }
  }

  function addLine(line) {
    const overlapping = (grid.lines || []).filter(item => item.axis === line.axis
      && (line.axis === 'horizontal'
        ? item.from.row === line.from.row && item.from.column <= line.to.column && item.to.column >= line.from.column
        : item.from.column === line.from.column && item.from.row <= line.to.row && item.to.row >= line.from.row))
    if (overlapping.length) {
      for (const item of overlapping) record({ type: 'line_remove', lineId: item.id })
    } else record({ type: 'line_add', ...line })
  }

  function startGesture(event, row, column) {
    setContextMenu(null)
    setInputTarget('grid')
    if (eraseMode) {
      event.preventDefault()
      stopGesture()
      gestureRef.current = { erasing: true, pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY }
      try { event.currentTarget.setPointerCapture?.(event.pointerId) } catch { /* Synthetic event. */ }
      eraseAtPoint(event.clientX, event.clientY)
      return
    }
    selectCell(row, column)
    if (lineMode) event.preventDefault()
    if (event.pointerType === 'mouse' && !lineMode) return
    stopGesture()
    const startCell = grid.cells[`${row}:${column}`]
    const sign = startCell?.main
    const gesture = { pointerId: event.pointerId, row, column, x: event.clientX, y: event.clientY,
      lastX: event.clientX, lastY: event.clientY, end: { row, column },
      line: lineMode, quickLine: !startCell?.main && !startCell?.note || ['+', '−', '×', '/'].includes(sign),
      horizontalLine: ['+', '−', '×', '/'].includes(sign),
      held: lineMode, cancelled: false, dragged: false, timer: null }
    try { event.currentTarget.setPointerCapture?.(event.pointerId) } catch { /* Synthetic pointer events have no active pointer. */ }
    if (!lineMode) gesture.timer = window.setTimeout(() => {
      if (gestureRef.current === gesture && !gesture.cancelled) gesture.held = true
    }, HOLD_MS)
    gestureRef.current = gesture
  }

  function moveGesture(event) {
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesture.pointerId) return
    if (gesture.erasing) {
      const steps = Math.max(1, Math.ceil(Math.hypot(event.clientX - gesture.lastX, event.clientY - gesture.lastY) / 8))
      for (let step = 1; step <= steps; step++) eraseAtPoint(
        gesture.lastX + (event.clientX - gesture.lastX) * step / steps,
        gesture.lastY + (event.clientY - gesture.lastY) * step / steps)
      gesture.lastX = event.clientX
      gesture.lastY = event.clientY
      return
    }
    const distance = Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y)
    if (gesture.cancelled) {
      const scroller = gridRef.current?.parentElement
      if (scroller) scroller.scrollLeft -= event.clientX - gesture.lastX
      window.scrollBy(0, gesture.lastY - event.clientY)
      gesture.lastX = event.clientX
      gesture.lastY = event.clientY
      return
    }
    if (distance < DRAG_PX) return
    if (!gesture.held) {
      gesture.cancelled = true
      window.clearTimeout(gesture.timer)
      return
    }
    gesture.dragged = true
    gesture.dx = event.clientX - gesture.x
    gesture.dy = event.clientY - gesture.y
    if (gesture.line || gesture.quickLine) {
      gesture.end = cellAtPoint(event.clientX, event.clientY) || gesture.end
      setLinePreview(lineBetween({ row: gesture.row, column: gesture.column },
        gesture.end, gesture.horizontalLine && !gesture.line))
    } else setDragPreview(Math.abs(gesture.dx) >= Math.abs(gesture.dy) ? `${gesture.row}:${gesture.column}` : '')
  }

  function finishGesture(event) {
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesture.pointerId) return
    if (gesture.erasing) { eraseAtPoint(event.clientX, event.clientY); stopGesture(); return }
    const position = { row: gesture.row, column: gesture.column }
    const held = gesture.held && !gesture.cancelled
    const dragged = gesture.dragged
    const line = gesture.line || (gesture.quickLine && dragged)
    const lineAction = lineBetween(position, gesture.end, gesture.horizontalLine && !gesture.line)
    stopGesture()
    if (!held) return
    event.preventDefault()
    if (line) addLine(lineAction)
    else if (dragged) {
      if (Math.abs(gesture.dx) >= Math.abs(gesture.dy)) toggleCrossOut(position)
      else setLayer(gesture.dy > 0 ? 'note' : 'main')
    }
  }

  function eraseCell(clear = false) {
    record(previous => {
      const { row, column, layer } = previous.cursor
      const before = previous.cells[`${row}:${column}`]?.[layer] || ''
      const after = layer === 'note' && !clear ? before.slice(0, -1) : ''
      return before ? { type: 'erase', position: { row, column }, layer, before, after } : null
    })
  }

  function eraseAtPoint(x, y) {
    const bounds = gridRef.current?.getBoundingClientRect()
    if (!bounds || x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return
    const point = { row: (y - bounds.top) / (bounds.height / grid.rows),
      column: (x - bounds.left) / (bounds.width / grid.columns) }
    const position = cellAtPoint(x, y)
    record(previous => {
      const line = previous.lines?.find(item => lineTouchesPoint(item, point))
      if (line) return { type: 'line_remove', lineId: line.id }
      const cell = previous.cells[`${position.row}:${position.column}`]
      const layer = cell?.note ? 'note' : 'main'
      return cell?.[layer] ? { type: 'erase', position, layer, before: cell[layer], after: '' } : null
    })
  }

  function changeAnswer(after) {
    if (task.answerType === 'text' ? after.length > 2000 : !NUMBER_ANSWER.test(after)) return
    record(previous => previous.answer === after ? null : { type: 'answer_change', before: previous.answer, after })
  }

  function keypad(character) {
    if (inputTarget === 'answer') changeAnswer(character === 'backspace' ? grid.answer.slice(0, -1)
      : character === 'clear' ? '' : character === '±' ? grid.answer.startsWith('−') || grid.answer.startsWith('-') ? grid.answer.slice(1) : `−${grid.answer}`
      : character === ',' && !grid.answer.replace(/^[−-]/u, '') ? `${grid.answer}0,` : `${grid.answer}${character}`)
    else if (character === 'backspace' || character === 'clear') eraseCell(character === 'clear')
    else if (character === '±') writeCell('−')
    else writeCell(character)
  }

  function writeCell(character) {
    record(previous => {
      const { row, column, layer } = previous.cursor
      const allowedNow = layer === 'note' ? /^[0-9]{1,2}$/u : MAIN_CHARACTERS
      if (!allowedNow.test(character)) return null
      const cell = previous.cells[`${row}:${column}`]
      if (cell?.[layer === 'note' ? 'main' : 'note']) return null
      const before = cell?.[layer] || ''
      const after = layer === 'note' ? `${before}${character}` : character
      return after.length > 2 || before === after ? null
        : { type: 'write', position: { row, column }, layer, before, after }
    })
  }

  function handleKeyDown(event) {
    if (grid.status === 'submitted') return
    const key = event.key
    if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Tab'].includes(key)) {
      if (key === 'Tab') {
        const index = grid.cursor.row * grid.columns + grid.cursor.column
        if ((event.shiftKey && index === 0)
          || (!event.shiftKey && index === grid.rows * grid.columns - 1)) return
      }
      event.preventDefault()
      record(previous => {
        const { row, column } = previous.cursor
        let to = { row, column }
        if (key === 'ArrowRight') to = { row, column: Math.min(previous.columns - 1, column + 1) }
        if (key === 'ArrowLeft') to = { row, column: Math.max(0, column - 1) }
        if (key === 'ArrowDown') to = { row: Math.min(previous.rows - 1, row + 1), column }
        if (key === 'ArrowUp') to = { row: Math.max(0, row - 1), column }
        if (key === 'Tab') {
          const offset = event.shiftKey ? -1 : 1
          const index = Math.max(0, Math.min(previous.rows * previous.columns - 1, row * previous.columns + column + offset))
          to = { row: Math.floor(index / previous.columns), column: index % previous.columns }
        }
        return to.row === row && to.column === column ? null
          : { type: 'move', from: { row, column }, to }
      })
      return
    }
    if (key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      setLayer(grid.cursor.layer === 'main' ? 'note' : 'main')
      return
    }
    if (key.toLowerCase() === 'x' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      toggleCrossOut()
      return
    }
    if (key === 'Escape') {
      event.preventDefault()
      setLayer('main')
      return
    }
    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault()
      eraseCell(key === 'Delete')
      return
    }
    const character = key === '=' ? '─' : key === '-' ? '−' : key === '*' ? '×' : key
    if (!MAIN_CHARACTERS.test(character) || event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault()
    writeCell(character)
  }

  function showSnapshot() {
    setSnapshotText(JSON.stringify(grid, null, 2))
    setMessage('Slutbild och händelser visas som JSON. Ingen serverlagring sker.')
  }

  function reloadSnapshot() {
    try {
      const restored = replayDiagnosticGrid(JSON.parse(snapshotText))
      const restoredTask = availableTasks.find(item => item.taskId === restored.taskId
        && item.taskVersion === restored.taskVersion)
      if (!restoredTask) throw new Error('Uppgiftsversionen finns inte i manifestet.')
      gridsRef.current.set(task.taskId, grid)
      gridsRef.current.set(restoredTask.taskId, restored)
      setGrid(restored)
      setTask(restoredTask)
      setMessage('Slutbilden återskapades från händelserna och stämmer med JSON-filen.')
    } catch (error) {
      setMessage(`Återläsning stoppad: ${error.message}`)
    }
  }

  const visibleCells = Array.from({ length: grid.rows * grid.columns }, (_, index) => ({
    row: Math.floor(index / grid.columns),
    column: index % grid.columns
  }))
  const selectedCell = grid.cells[`${grid.cursor.row}:${grid.cursor.column}`]
  const selectedIsDigit = /^[0-9]{1,2}$/u.test(selectedCell?.main || selectedCell?.note || '')
  const attemptFull = Boolean(pilot && isDiagnosticAttemptFull(grid.events))

  function formatButton(layer, label) {
    const active = grid.cursor.layer === layer
    const cannotConvert = selectedCell && !selectedIsDigit && Boolean(selectedCell.main || selectedCell.note)
    return <button type="button" onClick={() => { setInputTarget('grid'); setLineMode(false); setEraseMode(false); setLayer(layer); setContextMenu(null); focusSelectedCell() }}
      disabled={editingLocked || attemptFull || cannotConvert}
      aria-pressed={active}
      className="diagnostic-layer-button">
      {label}
    </button>
  }

  function writeOperationSign(sign) {
    if (selectedCell?.note || selectedCell?.struck) return
    setInputTarget('grid')
    setLayer('main')
    writeCell(sign)
    focusSelectedCell()
  }

  const pending = grid.events.length > (saveState?.savedSequence || 0)
  const status = workspaceOnly ? 'Arbetsyta i detta träningspass' : !pilot ? 'Skiss · ingen serverlagring' : saveState?.busy ? 'Sparar…'
    : saveState?.error ? 'Inte sparat på servern' : pending ? 'Väntar på serverkvittens'
    : grid.status === 'submitted' ? 'Inlämnat' : '• Sparat'
  const navigationLocked = saveState?.busy || saveState?.conflict || submitting
  const question = /^Räkna ut [0-9+−×/÷,. ]+\.$/u.test(task.promptSv)
    ? task.promptSv.replace(/^Räkna ut /u, '').replace(/\.$/u, '') : task.promptSv

  return (
    <main className="diagnostic-prototype">
      {!workspaceOnly && <header className="notebook-header">
        <div><strong>Screening</strong><span>{collectionTitle || 'Räknehäfte'}</span></div>
        {onHome && <a href="#" onClick={event => { event.preventDefault(); if (!navigationLocked) onHome() }}
          aria-disabled={Boolean(navigationLocked)}>Startsida</a>}
      </header>}
      {!pilot && <div className="notebook-examples" aria-label="Välj exempeluppgift">
        {availableTasks.map(item => <button key={item.taskId} type="button" onClick={() => chooseTask(item)}>{item.promptSv}</button>)}
      </div>}
      <section className="notebook-sheet">
        {pilot && !workspaceOnly && task.gridEnabled !== false && <button type="button" className="notebook-fold-toggle"
          aria-expanded={notebookVisible} onClick={() => {
            setNotebookVisible(value => !value)
            setInputTarget(notebookVisible ? 'answer' : 'grid')
            setContextMenu(null)
          }}>{notebookVisible ? 'Dölj räknehäfte' : 'Visa räknehäfte'}</button>}
        <div className="diagnostic-workspace">
          <div className="notebook-left">
            {!workspaceOnly && <p className="notebook-question-count">Fråga {questionIndex} av {questionCount}</p>}
            {!workspaceOnly && <h2 className="notebook-question">{question}</h2>}
            <div hidden={task.gridEnabled === false || !notebookVisible} className="notebook-grid-scroll">
          <div ref={gridRef} className="diagnostic-grid" role="group" aria-label="Rutat räknehäfte">
            <DiagnosticGridLines lines={grid.lines} preview={linePreview} rows={grid.rows} columns={grid.columns} />
            {visibleCells.map(({ row, column }) => {
              const cell = grid.cells[`${row}:${column}`] || { main: '', note: '' }
              const selected = grid.cursor.row === row && grid.cursor.column === column
              const layer = selected ? grid.cursor.layer : cell.note ? 'note' : 'main'
              return (
                <div key={`${row}:${column}`} className={`diagnostic-cell diagnostic-cell--${layer} ${selected ? 'diagnostic-cell--selected' : ''} ${dragPreview === `${row}:${column}` ? 'diagnostic-cell--drag-preview' : ''}`}>
                  <input
                    type="text"
                    inputMode="none"
                    readOnly
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    value=""
                    data-cell={`${row}:${column}`}
                    data-layer={layer}
                    tabIndex={selected && grid.status !== 'submitted' ? 0 : -1}
                    aria-label={`${selected ? 'Markerad ruta, ' : ''}rad ${row + 1}, kolumn ${column + 1}${cell.main ? `, stor siffra ${cell.main}` : ''}${cell.note ? `, minnessiffra ${cell.note}` : ''}${cell.struck ? ', struken' : ''}${!cell.main && !cell.note ? ', tom' : ''}`}
                    className="diagnostic-cell__input"
                    onPointerDown={event => startGesture(event, row, column)}
                    onPointerMove={moveGesture}
                    onPointerUp={finishGesture}
                    onPointerCancel={stopGesture}
                    onContextMenu={event => {
                      event.preventDefault()
                      if (event.button !== 2) return
                      selectCell(row, column)
                      setContextMenu({ x: Math.min(event.clientX, window.innerWidth - 190), y: Math.min(event.clientY, window.innerHeight - 145) })
                    }}
                    onFocus={() => moveCursor({ row, column })}
                    onChange={event => {
                      const entered = event.target.value
                      if (entered.length < 1 || entered.length > 2) return
                      writeCell(entered === '-' ? '−' : entered === '*' ? '×' : entered === '=' ? '─' : entered)
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={editingLocked}
                  />
                  {cell.main && <span className={`diagnostic-cell__digit diagnostic-cell__digit--main ${cell.main.length > 1 ? 'diagnostic-cell__digit--double' : ''} ${cell.struck ? 'diagnostic-cell__digit--struck' : ''}`}>{cell.main}</span>}
                  {cell.note && <span className={`diagnostic-cell__digit diagnostic-cell__digit--note ${cell.struck ? 'diagnostic-cell__digit--struck' : ''}`}>{cell.note}</span>}
                </div>
              )
            })}
          </div>
            </div>
            {!workspaceOnly && <div className="diagnostic-answer-row">
              {task.answerType === 'text' ? <textarea id="diagnostic-answer" aria-label="Mitt svar" placeholder="Skriv ditt svar här"
                maxLength={2000} value={grid.answer} onChange={event => changeAnswer(event.target.value)} disabled={editingLocked} />
                : <input id="diagnostic-answer" aria-label="Mitt svar" placeholder="Skriv ditt svar här" type="text" inputMode="none"
                  readOnly value={grid.answer} onFocus={() => setInputTarget('answer')}
                  onKeyDown={event => {
                    if (event.ctrlKey || event.metaKey || event.altKey) return
                    if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); changeAnswer(event.key === 'Delete' ? '' : grid.answer.slice(0, -1)) }
                    else if (/^[0-9−,-]$/u.test(event.key)) { event.preventDefault(); changeAnswer(`${grid.answer}${event.key}`) }
                  }} disabled={editingLocked} />}
              {pilot && <button type="button" className="notebook-next" onClick={onNext} disabled={!onNext || navigationLocked}>
                Nästa fråga <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3" /></svg>
              </button>}
            </div>}
          </div>
          {(task.gridEnabled !== false || task.answerType !== 'text') && <NotebookTools
            formats={<>{formatButton('main', 'Stor')}{formatButton('note', 'Liten')}</>}
            disabled={editingLocked || attemptFull} gridEnabled={task.gridEnabled !== false && notebookVisible}
            lineMode={lineMode} eraseMode={eraseMode}
            onLine={() => { setInputTarget('grid'); setLineMode(current => !current); setEraseMode(false) }}
            onErase={() => { setInputTarget('grid'); setEraseMode(current => !current); setLineMode(false) }}
            canLoan={selectedIsDigit} onLoan={() => { setInputTarget('grid'); toggleCrossOut(); setLineMode(false); setEraseMode(false); focusSelectedCell() }}
            onKey={keypad} onSign={writeOperationSign} signsDisabled={Boolean(selectedCell?.note || selectedCell?.struck)}
            status={status} />}
        </div>
        {task.drawingEnabled && <div className="notebook-drawing">
          <button type="button" className="notebook-drawing-toggle" aria-label="Rityta" aria-expanded={drawingVisible}
            onClick={() => setDrawingVisible(current => !current)}>
            <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><path d="M17 5H6a2 2 0 0 0-2 2v21h22V17M11 22l2-7L25 3l4 4-12 12-6 3zm2-7 4 4" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
          </button>
          <MathScratchpad visible={drawingVisible} wide strokes={grid.drawing} readOnly={editingLocked || attemptFull}
            onStroke={stroke => record({ type: 'drawing_stroke', ...stroke })}
            onClear={() => record({ type: 'drawing_clear' })} />
        </div>}
        {contextMenu && <div className="diagnostic-context-menu" role="group" aria-label="Ändra markerad siffra"
          style={{ left: Math.max(8, contextMenu.x), top: Math.max(8, contextMenu.y) }}>
          {formatButton('main', 'Stor')}{formatButton('note', 'Minnessiffra')}
          <button type="button" disabled={editingLocked || !selectedIsDigit}
            onClick={() => { toggleCrossOut(); setContextMenu(null); focusSelectedCell() }}>{selectedCell?.struck ? 'Ta bort streck' : 'Stryk/låna'}</button>
        </div>}
        {attemptFull && <p role="alert">Räknehäftet är fullt. Det du redan skrivit finns kvar; kontrollera sparstatus.</p>}
        {pilot && !workspaceOnly && <footer className="notebook-footer">
          <button type="button" onClick={onPrevious} disabled={!onPrevious || navigationLocked}>← Förra frågan</button>
          <button type="button" onClick={() => onSubmitCollection?.(grid)}
            className={!onNext ? 'notebook-submit-ready' : ''}
            disabled={saveState?.collectionSubmitted || navigationLocked}>Lämna in svaren</button>
        </footer>}
        {pilot && !workspaceOnly && <div className="notebook-save-detail" role={saveState?.error ? 'alert' : 'status'}>
          {saveState?.error || (pending ? grid.events.length <= (saveState?.localSequence || 0)
            ? 'Sparat krypterat på den här enheten. Väntar på serverkvittens.'
            : 'Osparade ändringar. Sparas krypterat på enheten och skickas automatiskt till servern.'
            : saveState?.message || 'Alla ändringar är sparade på servern.')}
          {saveState?.error && !saveState.conflict && <button type="button" onClick={() => onSave?.(grid)}
            disabled={saveState.busy}>Försök spara igen</button>}
        </div>}
      </section>
      {!pilot && <section className="notebook-debug">
        <h2>Kontrollera observationen</h2>
        <button type="button" onClick={showSnapshot}>Visa JSON</button>
        <button type="button" onClick={reloadSnapshot} disabled={!snapshotText.trim()}>Återläs JSON</button>
        <button type="button" onClick={() => record({ type: 'submit' })} disabled={editingLocked}>Frys försöket</button>
        <button type="button" onClick={() => record(previous => previous.lines?.length
          ? { type: 'line_remove', lineId: previous.lines.at(-1).id } : null)}
          disabled={editingLocked || !grid.lines?.length}>Ta bort senaste streck</button>
        <p role="status">{message || `Status: ${grid.status === 'submitted' ? 'fryst' : 'pågående'}`}</p>
        <label htmlFor="diagnostic-snapshot">Arbetskopia av JSON för återläsning</label>
        <textarea id="diagnostic-snapshot" value={snapshotText} onChange={event => setSnapshotText(event.target.value)} spellCheck="false" />
      </section>}
    </main>
  )
}

export default DiagnosticGridPrototype
