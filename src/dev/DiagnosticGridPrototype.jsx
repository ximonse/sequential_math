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
import './diagnosticGridPrototype.css'

const TASKS = taskManifest.tasks
const OPERATION_SIGNS = ['+', '−', '×', '/']
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

function DiagnosticGridPrototype({ pilot = null, onSave = null, onGridChange = null, saveState = null,
  onNext = null, onPrevious = null, onSubmitCollection = null, collectionTitle = '', questionIndex = 1, questionCount = 1 }) {
  const availableTasks = pilot ? [pilot.task] : TASKS
  const [task, setTask] = useState(pilot?.task || TASKS[0])
  const [grid, setGrid] = useState(() => pilot?.snapshot || newGrid(TASKS[0]))
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
    const sign = grid.cells[`${row}:${column}`]?.main
    const gesture = { pointerId: event.pointerId, row, column, x: event.clientX, y: event.clientY,
      lastX: event.clientX, lastY: event.clientY, end: { row, column },
      line: lineMode, quickLine: ['+', '−', '×'].includes(sign),
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
    if (gesture.line || gesture.quickLine) {
      gesture.end = cellAtPoint(event.clientX, event.clientY) || gesture.end
      setLinePreview(lineBetween({ row: gesture.row, column: gesture.column },
        gesture.end, gesture.quickLine && !gesture.line))
    } else setDragPreview(`${gesture.row}:${gesture.column}`)
  }

  function finishGesture(event) {
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesture.pointerId) return
    if (gesture.erasing) { eraseAtPoint(event.clientX, event.clientY); stopGesture(); return }
    const position = { row: gesture.row, column: gesture.column }
    const held = gesture.held && !gesture.cancelled
    const dragged = gesture.dragged
    const line = gesture.line || (gesture.quickLine && dragged)
    const lineAction = lineBetween(position, gesture.end, gesture.quickLine && !gesture.line)
    stopGesture()
    if (!held) return
    event.preventDefault()
    if (line) addLine(lineAction)
    else if (dragged) toggleCrossOut(position)
    else {
      const cell = grid.cells[`${position.row}:${position.column}`]
      if (/^[0-9]{1,2}$/u.test(cell?.main || cell?.note || '')) {
        setLayer(cell?.note ? 'main' : 'note')
      }
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
    if (task.answerType === 'text' ? after.length > 2000 : !/^[−-]?\d{0,12}$/u.test(after)) return
    record(previous => previous.answer === after ? null : { type: 'answer_change', before: previous.answer, after })
  }

  function keypad(character) {
    if (inputTarget === 'answer') changeAnswer(character === 'erase' ? grid.answer.slice(0, -1) : `${grid.answer}${character}`)
    else if (character === 'erase') eraseCell()
    else writeCell(character)
  }

  function writeCell(character) {
    record(previous => {
      const { row, column, layer } = previous.cursor
      const allowedNow = layer === 'note' ? /^[0-9]{1,2}$/u : /^[0-9+−×/÷,─]$/u
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
    if (!/^[0-9+−×/÷,─]$/u.test(character) || event.ctrlKey || event.metaKey || event.altKey) return
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
    return <button type="button" onClick={() => { setLayer(layer); setContextMenu(null); focusSelectedCell() }}
      disabled={grid.status === 'submitted' || cannotConvert}
      className={`diagnostic-layer-button rounded-lg border px-3 py-2 font-medium ${active ? 'border-orange-700 bg-orange-700 text-white' : 'border-orange-300 bg-orange-100 text-orange-950'} disabled:opacity-50`}>
      {label}
    </button>
  }

  function writeOperationSign(sign) {
    if (selectedCell?.note || selectedCell?.struck) return
    setLayer('main')
    writeCell(sign)
    focusSelectedCell()
  }

  return (
    <main className="diagnostic-prototype mx-auto max-w-5xl px-4 pb-12 pt-5">
      <header className="mb-2">
        <p className="text-sm font-semibold text-slate-600">{pilot ? `${collectionTitle || 'Din samling'} · Fråga ${questionIndex} av ${questionCount}` : 'Isolerad utvecklingsprototyp'}</p>
        <h1 className="text-3xl font-bold">Digitalt räknehäfte</h1>
        <p className="mt-2 text-slate-700">{pilot ? 'Arbetet sparas automatiskt efter en kort paus. Kontrollera sparstatus innan du lämnar sidan.' : 'Ingen elevdata sparas. Här prövas endast inmatning och återspelning.'}</p>
      </header>

      {!pilot && <div className="mb-5 flex flex-wrap gap-2" aria-label="Välj exempeluppgift">
        {availableTasks.map(item => (
          <button
            key={item.taskId}
            type="button"
            className={`rounded-lg border px-3 py-2 font-medium ${task.taskId === item.taskId ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-400 bg-white text-slate-800'}`}
            onClick={() => chooseTask(item)}
          >
            {item.promptSv}
          </button>
        ))}
      </div>}

      <section className="rounded-lg border border-orange-300 bg-orange-50 p-2 shadow-sm">
        <p className="text-sm text-slate-600">Uppgift {task.taskId}, version {task.taskVersion}</p>
        <h2 className="mt-1 text-2xl font-semibold">{task.promptSv}</h2>

        <div className={task.gridEnabled === false ? 'hidden' : 'mt-3 flex flex-wrap items-center gap-2'} role="group" aria-label="Räknetecken">
          {OPERATION_SIGNS.map(sign => <button key={sign} type="button"
            aria-label={`Skriv ${sign}`}
            onClick={() => writeOperationSign(sign)}
            disabled={grid.status === 'submitted' || attemptFull || Boolean(selectedCell?.note || selectedCell?.struck)}
            className="diagnostic-sign-button rounded-lg border border-orange-400 bg-white font-semibold text-orange-950 disabled:opacity-50">
            {sign}
          </button>)}
          <button type="button" aria-label="Streckläge" aria-pressed={lineMode} onClick={() => { setLineMode(current => !current); setEraseMode(false) }}
            disabled={grid.status === 'submitted' || attemptFull}
            className={`diagnostic-line-button rounded-lg border px-2 font-semibold ${lineMode ? 'border-orange-700 bg-orange-700 text-white' : 'border-orange-400 bg-white text-orange-950'} disabled:opacity-50`}>
            {lineMode ? '✓ Streck' : 'Streck'}
          </button>
          <button type="button" aria-label="Suddverktyg" aria-pressed={eraseMode}
            disabled={grid.status === 'submitted' || attemptFull}
            onClick={() => { setEraseMode(current => !current); setLineMode(false) }}
            className={`rounded border px-2 py-1 font-semibold ${eraseMode ? 'border-orange-700 bg-orange-700 text-white' : 'border-orange-400 bg-white text-orange-950'}`}>
            <svg className="mr-1 inline-block h-4 w-4" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 14 10-10 8 8-9 9H8zM8 9l8 8M12 21h10" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
            Sudd
          </button>
        </div>

        <div className="diagnostic-workspace">
        <div className="min-w-0">
        <div hidden={task.gridEnabled === false}>
        <div className="mt-3 overflow-x-auto pb-2">
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
        </div>
        <div className="diagnostic-answer-row mt-1 flex items-end gap-1">
          <label className="block min-w-0 flex-1 text-base font-semibold" htmlFor="diagnostic-answer">Mitt svar
            {task.answerType === 'text' ? <textarea id="diagnostic-answer" maxLength={2000} value={grid.answer}
              onChange={event => changeAnswer(event.target.value)} disabled={editingLocked}
              className="mt-1 block min-h-24 w-full rounded border border-slate-500 bg-white px-2 py-1 font-normal" />
              : <input id="diagnostic-answer" type="text" inputMode="none" readOnly value={grid.answer}
                onFocus={() => setInputTarget('answer')}
                onKeyDown={event => {
                  if (event.ctrlKey || event.metaKey || event.altKey) return
                  if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); changeAnswer(event.key === 'Delete' ? '' : grid.answer.slice(0, -1)) }
                  else if (/^[0-9−-]$/u.test(event.key)) { event.preventDefault(); changeAnswer(`${grid.answer}${event.key}`) }
                }} disabled={editingLocked}
                className="mt-1 block w-full rounded border border-slate-500 bg-white px-2 py-1 text-xl font-normal" />}
          </label>
          {pilot && <button type="button" onClick={() => onSave?.(grid)} disabled={grid.status === 'submitted' || saveState?.busy || saveState?.conflict}
            className="rounded bg-blue-700 px-2 py-1 font-semibold text-white disabled:opacity-50">Svara</button>}
        </div>
        </div>
        {task.gridEnabled !== false || task.answerType !== 'text' ? <div className="diagnostic-keypad mt-3" role="group" aria-label="Sifferknappar">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(digit => <button key={digit} type="button" aria-label={`Skriv ${digit}`}
            onClick={() => keypad(String(digit))} disabled={editingLocked || attemptFull}
            className="rounded border border-slate-400 bg-white font-semibold text-slate-900 disabled:opacity-50">{digit}</button>)}
          <button type="button" aria-label="Radera siffra" onClick={() => keypad('erase')} disabled={editingLocked || attemptFull}
            className="rounded border border-slate-400 bg-white">⌫</button>
        </div> : null}
        </div>
        {task.drawingEnabled && <MathScratchpad visible strokes={grid.drawing} readOnly={editingLocked || attemptFull}
          onStroke={stroke => record({ type: 'drawing_stroke', ...stroke })} />}
        <div className={task.gridEnabled === false ? 'hidden' : 'mt-3 flex flex-wrap items-center gap-2'}>
          {formatButton('main', 'Stor (Esc)')}
          {formatButton('note', 'Minnessiffra (N)')}
          <button type="button" onClick={() => { toggleCrossOut(); setContextMenu(null); focusSelectedCell() }}
            disabled={grid.status === 'submitted' || !selectedIsDigit}
            className="diagnostic-layer-button rounded-lg border border-orange-300 bg-orange-100 px-3 py-2 font-medium text-orange-950 disabled:opacity-50">
            {selectedCell?.struck ? 'Ta bort lånestreck (X)' : 'Stryk/låna (X)'}
          </button>
          <button type="button" onClick={() => record(previous => previous.lines?.length
            ? { type: 'line_remove', lineId: previous.lines.at(-1).id } : null)}
            disabled={grid.status === 'submitted' || attemptFull || !grid.lines?.length}
            className="diagnostic-layer-button rounded-lg border border-orange-300 bg-orange-100 px-3 py-2 font-medium text-orange-950 disabled:opacity-50">
            Ta bort senaste streck
          </button>
        </div>
        <details className="diagnostic-instructions mt-3 rounded-lg border border-orange-300 bg-white p-3 text-sm text-slate-700">
          <summary className="cursor-pointer font-semibold text-orange-950">Visa instruktion och hjälp</summary>
          <p className="mt-3 text-base">{pilot ? pilot.instructionSv : taskManifest.instructionSv}</p>
          <div className="mt-2 space-y-2">
            <p><strong>Skriv siffror:</strong> Välj en ruta och använd sifferknapparna. Fysiskt tangentbord fungerar också. Välj Mitt svar för att skriva slutsvaret.</p>
            <p><strong>Minnessiffror och lån:</strong> Använd Minnessiffra och Stryk/låna. Håll och släpp på en siffra för att växla storlek; håll och dra för överstrykning.</p>
            <p><strong>Streck:</strong> Aktivera Streck och dra. Nya streck följer rutornas gränser. Tryck Streck igen för att skriva.</p>
            <p><strong>Sudda:</strong> Aktivera sudd-ikonen och dutta eller dra över det du vill ta bort. Stäng av suddet för att skriva igen.</p>
            <p><strong>Spara och lämna in:</strong> Svara sparar utan att låsa frågan. Du kan gå tillbaka och ändra. Lämna in svaren lämnar in hela samlingen.</p>
            <p><strong>På dator:</strong> Pilar och tabulator flyttar markören. Backspace raderar. N väljer minnessiffra och X växlar överstrykning.</p>
          </div>
        </details>
        {contextMenu && <div className="diagnostic-context-menu" role="group" aria-label="Ändra markerad siffra" style={{ left: Math.max(8, contextMenu.x), top: Math.max(8, contextMenu.y) }}>
          {formatButton('main', 'Stor')}
          {formatButton('note', 'Minnessiffra')}
          <button type="button" disabled={!selectedIsDigit} onClick={() => { toggleCrossOut(); setContextMenu(null); focusSelectedCell() }}>
            {selectedCell?.struck ? 'Ta bort streck' : 'Stryk/låna'}
          </button>
        </div>}
        <p hidden={task.gridEnabled === false} className="mt-2 text-sm text-slate-700">Markerad ruta: rad {grid.cursor.row + 1}, kolumn {grid.cursor.column + 1}, {grid.cursor.layer === 'note' ? 'minnessiffra' : 'stor siffra'}. Händelser: {grid.events.length}.</p>
        {attemptFull && <p role="alert" className="mt-2 rounded-lg border border-amber-500 bg-amber-100 p-3 text-amber-950">Räknehäftet är fullt. Du kan inte skriva mer i det här försöket. Det du redan skrivit finns kvar; kontrollera sparstatus nedan.</p>}
      </section>

      <section className="mt-5 rounded-2xl border border-orange-300 bg-orange-50 p-4 sm:p-6">
        <h2 className="text-xl font-semibold">{pilot ? 'Spara observationen' : 'Kontrollera observationen'}</h2>
        <p className="mt-1 text-sm text-slate-700">Räknehäftet bedömer inte om svaret eller metoden är rätt.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {pilot && <button type="button" onClick={() => onSave?.(grid)} disabled={saveState?.busy || saveState?.conflict || grid.events.length <= (saveState?.savedSequence || 0)}
            className={`rounded px-2 py-1 font-semibold text-white disabled:opacity-70 ${saveState?.error ? 'bg-red-700' : grid.events.length <= (saveState?.savedSequence || 0) ? 'bg-emerald-700' : 'bg-blue-700'}`}>{saveState?.busy ? 'Sparar...' : 'Spara arbetet'}</button>}
          {!pilot && <button type="button" onClick={showSnapshot} className="rounded-lg bg-blue-700 px-4 py-2 text-white">Visa JSON</button>}
          {!pilot && <button type="button" onClick={reloadSnapshot} disabled={!snapshotText.trim()} className="rounded-lg border border-blue-700 px-4 py-2 text-blue-800 disabled:opacity-50">Återläs JSON</button>}
          <button type="button" onClick={() => pilot ? onSubmitCollection?.(grid) : record({ type: 'submit' })}
            disabled={(pilot ? saveState?.collectionSubmitted : grid.status === 'submitted') || saveState?.busy || saveState?.conflict}
            className={`rounded border px-2 py-1 font-semibold disabled:opacity-50 ${pilot && !onNext ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-500'}`}>{pilot ? 'Lämna in svaren' : 'Frys försöket'}</button>
          {pilot && onPrevious && <button type="button" onClick={onPrevious} disabled={saveState?.busy || saveState?.conflict}
            className="rounded border border-blue-700 px-2 py-1 font-semibold text-blue-800 disabled:opacity-50">Förra frågan</button>}
          {pilot && onNext && <button type="button" onClick={onNext}
            disabled={saveState?.busy || saveState?.conflict}
            className="rounded bg-blue-700 px-2 py-1 font-semibold text-white disabled:opacity-50">Nästa fråga</button>}
        </div>
        <p className="mt-2 text-sm" role={saveState?.error ? 'alert' : 'status'}>{pilot
          ? saveState?.busy ? 'Sparar...' : saveState?.error || (grid.events.length > (saveState?.savedSequence || 0)
            ? grid.events.length <= (saveState?.localSequence || 0)
              ? 'Sparat krypterat på den här enheten. Väntar på serverkvittens.'
              : 'Osparade ändringar. Sparas krypterat på enheten och skickas automatiskt till servern.'
            : saveState?.message || 'Alla ändringar är sparade på servern.')
          : message || `Status: ${grid.status === 'submitted' ? 'fryst' : 'pågående'}`}</p>
        {!pilot && <><label className="mt-3 block text-sm font-medium" htmlFor="diagnostic-snapshot">Arbetskopia av JSON för återläsning</label>
        <textarea id="diagnostic-snapshot" value={snapshotText} onChange={event => setSnapshotText(event.target.value)}
          className="mt-1 h-44 w-full rounded-lg border border-slate-400 p-3 font-mono text-xs" spellCheck="false" /></>}
      </section>
    </main>
  )
}

export default DiagnosticGridPrototype
