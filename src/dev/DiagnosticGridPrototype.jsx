import { useEffect, useRef, useState } from 'react'
import taskManifest from '../domains/arithmetic/diagnosticTasks.v1.json'
import {
  createDiagnosticGrid,
  recordDiagnosticGridEvent,
  replayDiagnosticGrid
} from '../domains/arithmetic/diagnosticGridModel'
import { exceedsDiagnosticAttemptQuota, isDiagnosticAttemptFull } from '../domains/arithmetic/diagnosticAttemptAppend'
import DiagnosticGridLines from './DiagnosticGridLines'
import './diagnosticGridPrototype.css'

const TASKS = taskManifest.tasks
const OPERATION_SIGNS = ['+', '−', '×', '/']
const HOLD_MS = 500
const DRAG_PX = 12

function lineBetween(from, to, horizontalOnly = false) {
  const axis = horizontalOnly || Math.abs(to.column - from.column) >= Math.abs(to.row - from.row)
    ? 'horizontal' : 'vertical'
  if (axis === 'horizontal') return { axis,
    from: { row: from.row, column: Math.min(from.column, to.column) },
    to: { row: from.row, column: Math.max(from.column, to.column) } }
  return { axis,
    from: { row: Math.min(from.row, to.row), column: from.column },
    to: { row: Math.max(from.row, to.row), column: from.column } }
}

function newGrid(task) {
  return createDiagnosticGrid({
    attemptId: `prototype:${crypto.randomUUID()}`,
    taskId: task.taskId,
    taskVersion: task.taskVersion
  })
}

function DiagnosticGridPrototype({ pilot = null, onSave = null, onGridChange = null, saveState = null }) {
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
  const [contextMenu, setContextMenu] = useState(null)

  useEffect(() => { onGridChange?.(grid.events.length, grid) }, [grid, onGridChange])

  function record(actionOrBuilder) {
    const timestamp = Date.now()
    setGrid(previous => {
      if (previous.status === 'submitted') return previous
      if (pilot && isDiagnosticAttemptFull(previous.events)) return previous
      const action = typeof actionOrBuilder === 'function' ? actionOrBuilder(previous) : actionOrBuilder
      if (!action) return previous
      const next = recordDiagnosticGridEvent(previous, action, timestamp)
      return pilot && exceedsDiagnosticAttemptQuota(next.events) ? previous : next
    })
  }

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
  }, [grid.status])

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
    record(previous => previous.lines?.some(item => item.axis === line.axis
      && item.from.row === line.from.row && item.from.column === line.from.column
      && item.to.row === line.to.row && item.to.column === line.to.column)
      ? null : { type: 'line_add', ...line })
  }

  function startGesture(event, row, column) {
    setContextMenu(null)
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
      <header className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">{pilot ? 'Ditt testuppdrag' : 'Isolerad utvecklingsprototyp'}</p>
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

      <section className="rounded-2xl border border-orange-300 bg-orange-50 p-4 shadow-sm sm:p-6">
        <p className="text-sm text-slate-600">Uppgift {task.taskId}, version {task.taskVersion}</p>
        <h2 className="mt-1 text-2xl font-semibold">{task.promptSv}</h2>

        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Räknetecken">
          {OPERATION_SIGNS.map(sign => <button key={sign} type="button"
            aria-label={`Skriv ${sign}`}
            onClick={() => writeOperationSign(sign)}
            disabled={grid.status === 'submitted' || attemptFull || Boolean(selectedCell?.note || selectedCell?.struck)}
            className="diagnostic-sign-button rounded-lg border border-orange-400 bg-white font-semibold text-orange-950 disabled:opacity-50">
            {sign}
          </button>)}
          <button type="button" aria-label="Streckläge" aria-pressed={lineMode} onClick={() => setLineMode(current => !current)}
            disabled={grid.status === 'submitted' || attemptFull}
            className={`diagnostic-line-button rounded-lg border px-2 font-semibold ${lineMode ? 'border-orange-700 bg-orange-700 text-white' : 'border-orange-400 bg-white text-orange-950'} disabled:opacity-50`}>
            {lineMode ? '✓ Streck' : 'Streck'}
          </button>
        </div>

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
                    inputMode="numeric"
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
                    disabled={grid.status === 'submitted'}
                  />
                  {cell.main && <span className={`diagnostic-cell__digit diagnostic-cell__digit--main ${cell.main.length > 1 ? 'diagnostic-cell__digit--double' : ''} ${cell.struck ? 'diagnostic-cell__digit--struck' : ''}`}>{cell.main}</span>}
                  {cell.note && <span className={`diagnostic-cell__digit diagnostic-cell__digit--note ${cell.struck ? 'diagnostic-cell__digit--struck' : ''}`}>{cell.note}</span>}
                </div>
              )
            })}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
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
          <p className="mt-2">Dutta på en ruta och skriv siffror med enhetens tangentbord. Tryck på ett räknetecken ovan för att skriva det i markerad ruta. Tryck Streck och dra över tomma eller ifyllda rutor för ett vågrätt eller lodrätt streck; ett tryck ger ett kort vågrätt streck. Tryck Streck igen för att skriva siffror. Du kan också hålla på +, − eller × och dra för ett vågrätt streck. En ny siffra blir stor. Håll och släpp på en siffra för att växla storlek; håll och dra på siffran för att stryka eller ta bort lånestrecket. Knapparna nedanför gör samma sak, och högerklick visar valen på dator. En minnessiffra kan ha två siffror. Pilar eller tabulator flyttar markören. Backspace raderar, Delete tömmer rutan. Svep i sidled om alla kolumner inte syns.</p>
        </details>
        {contextMenu && <div className="diagnostic-context-menu" role="group" aria-label="Ändra markerad siffra" style={{ left: Math.max(8, contextMenu.x), top: Math.max(8, contextMenu.y) }}>
          {formatButton('main', 'Stor')}
          {formatButton('note', 'Minnessiffra')}
          <button type="button" disabled={!selectedIsDigit} onClick={() => { toggleCrossOut(); setContextMenu(null); focusSelectedCell() }}>
            {selectedCell?.struck ? 'Ta bort streck' : 'Stryk/låna'}
          </button>
        </div>}
        <p className="mt-2 text-sm text-slate-700">Markerad ruta: rad {grid.cursor.row + 1}, kolumn {grid.cursor.column + 1}, {grid.cursor.layer === 'note' ? 'minnessiffra' : 'stor siffra'}. Händelser: {grid.events.length}.</p>
        {attemptFull && <p role="alert" className="mt-2 rounded-lg border border-amber-500 bg-amber-100 p-3 text-amber-950">Räknehäftet är fullt. Du kan inte skriva mer i det här försöket. Det du redan skrivit finns kvar; kontrollera sparstatus nedan.</p>}
        <label className="mt-4 block text-base font-semibold" htmlFor="diagnostic-answer">Mitt svar</label>
        <input id="diagnostic-answer" type="text" inputMode="numeric" value={grid.answer}
          onChange={event => {
            const after = event.target.value
            if (!/^[−-]?\d{0,12}$/u.test(after)) return
            record(previous => previous.answer === after
              ? null
              : { type: 'answer_change', before: previous.answer, after })
          }}
          disabled={grid.status === 'submitted'}
          className="mt-1 w-full max-w-xs rounded-lg border border-slate-500 px-3 py-2 text-xl" />
      </section>

      <section className="mt-5 rounded-2xl border border-orange-300 bg-orange-50 p-4 sm:p-6">
        <h2 className="text-xl font-semibold">{pilot ? 'Spara observationen' : 'Kontrollera observationen'}</h2>
        <p className="mt-1 text-sm text-slate-700">Räknehäftet bedömer inte om svaret eller metoden är rätt.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {pilot && <button type="button" onClick={() => onSave?.(grid)} disabled={saveState?.busy || saveState?.conflict || grid.events.length <= (saveState?.savedSequence || 0)}
            className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{saveState?.busy ? 'Sparar...' : 'Spara arbetet'}</button>}
          {!pilot && <button type="button" onClick={showSnapshot} className="rounded-lg bg-blue-700 px-4 py-2 text-white">Visa JSON</button>}
          {!pilot && <button type="button" onClick={reloadSnapshot} disabled={!snapshotText.trim()} className="rounded-lg border border-blue-700 px-4 py-2 text-blue-800 disabled:opacity-50">Återläs JSON</button>}
          <button type="button" onClick={() => record({ type: 'submit' })} disabled={grid.status === 'submitted'}
            className="rounded-lg border border-slate-500 px-4 py-2 disabled:opacity-50">Frys försöket</button>
        </div>
        <p className="mt-3 text-sm" role="status">{pilot
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
