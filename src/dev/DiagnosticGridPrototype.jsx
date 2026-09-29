import { useEffect, useRef, useState } from 'react'
import taskManifest from '../domains/arithmetic/diagnosticTasks.v1.json'
import {
  createDiagnosticGrid,
  recordDiagnosticGridEvent,
  replayDiagnosticGrid
} from '../domains/arithmetic/diagnosticGridModel'
import './diagnosticGridPrototype.css'

const TASKS = taskManifest.tasks
const GRID_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '+', '−', ',', '─']

function newGrid(task) {
  return createDiagnosticGrid({
    attemptId: `prototype:${crypto.randomUUID()}`,
    taskId: task.taskId,
    taskVersion: task.taskVersion
  })
}

function DiagnosticGridPrototype() {
  const [task, setTask] = useState(TASKS[0])
  const [grid, setGrid] = useState(() => newGrid(TASKS[0]))
  const [snapshotText, setSnapshotText] = useState('')
  const [message, setMessage] = useState('')
  const [noteView, setNoteView] = useState('small')
  const gridRef = useRef(null)
  const gridsRef = useRef(new Map())

  function record(actionOrBuilder) {
    const timestamp = Date.now()
    setGrid(previous => {
      if (previous.status === 'submitted') return previous
      const action = typeof actionOrBuilder === 'function' ? actionOrBuilder(previous) : actionOrBuilder
      return action ? recordDiagnosticGridEvent(previous, action, timestamp) : previous
    })
  }

  useEffect(() => {
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

  function setLayer(layer) {
    record(previous => layer === previous.cursor.layer
      ? null
      : { type: 'layer', from: previous.cursor.layer, to: layer })
  }

  function eraseCell() {
    record(previous => {
      const { row, column, layer } = previous.cursor
      const before = previous.cells[`${row}:${column}`]?.[layer] || ''
      return before ? { type: 'erase', position: { row, column }, layer, before, after: '' } : null
    })
  }

  function writeCell(character) {
    record(previous => {
      const { row, column, layer } = previous.cursor
      const allowedNow = layer === 'note' ? /^[0-9]$/u : /^[0-9+−,─]$/u
      if (!allowedNow.test(character)) return null
      const before = previous.cells[`${row}:${column}`]?.[layer] || ''
      return before === character ? null : { type: 'write', position: { row, column }, layer, before, after: character }
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
      record(previous => ({ type: 'layer', from: previous.cursor.layer,
        to: previous.cursor.layer === 'main' ? 'note' : 'main' }))
      return
    }
    if (key === 'Escape') {
      event.preventDefault()
      setLayer('main')
      return
    }
    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault()
      eraseCell()
      return
    }
    const character = key === '=' ? '─' : key === '-' ? '−' : key
    if (!/^[0-9+−,─]$/u.test(character) || event.ctrlKey || event.metaKey || event.altKey) return
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
      const restoredTask = TASKS.find(item => item.taskId === restored.taskId
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

  return (
    <main className="diagnostic-prototype mx-auto max-w-5xl px-4 pb-12 pt-5">
      <header className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">Isolerad utvecklingsprototyp</p>
        <h1 className="text-3xl font-bold">Digitalt räknehäfte</h1>
        <p className="mt-2 text-slate-700">Ingen elevdata sparas. Här prövas endast inmatning och återspelning.</p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2" aria-label="Välj exempeluppgift">
        {TASKS.map(item => (
          <button
            key={item.taskId}
            type="button"
            className={`rounded-lg border px-3 py-2 font-medium ${task.taskId === item.taskId ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-400 bg-white text-slate-800'}`}
            onClick={() => chooseTask(item)}
          >
            {item.promptSv}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-sm text-slate-600">Uppgift {task.taskId}, version {task.taskVersion}</p>
        <h2 className="mt-1 text-2xl font-semibold">{task.promptSv}</h2>
        <p className="mt-2 text-lg">{taskManifest.instructionSv}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setLayer('main')} disabled={grid.status === 'submitted'}
            className={`rounded-lg px-3 py-2 ${grid.cursor.layer === 'main' ? 'bg-slate-900 text-white' : 'bg-slate-200'}`}>
            Stora siffror (Esc)
          </button>
          <button type="button" onClick={() => setLayer('note')} disabled={grid.status === 'submitted'}
            className={`rounded-lg px-3 py-2 ${grid.cursor.layer === 'note' ? 'bg-slate-900 text-white' : 'bg-slate-200'}`}>
            Liten anteckning (N)
          </button>
          <span className="ml-2 text-sm text-slate-600">Visa anteckning:</span>
          <button type="button" onClick={() => setNoteView('small')} aria-pressed={noteView === 'small'}
            className="rounded-lg border border-slate-400 px-3 py-2">I rutan</button>
          <button type="button" onClick={() => setNoteView('row')} aria-pressed={noteView === 'row'}
            className="rounded-lg border border-slate-400 px-3 py-2">På hjälprad</button>
        </div>

        <p className="mt-4 text-sm text-slate-700">Tryck på en ruta och använd knapparna nedan, eller skriv med tangentbord. Pilar eller tabulator flyttar markören. Backspace raderar. N växlar anteckningsläge. Svep i sidled om alla kolumner inte syns.</p>
        <div className="mt-3 overflow-x-auto pb-2">
          <div ref={gridRef} className={`diagnostic-grid ${noteView === 'row' ? 'diagnostic-grid--helper-row' : ''}`} role="group" aria-label="Rutat räknehäfte">
            {Array.from({ length: grid.rows * grid.columns }, (_, index) => {
              const row = Math.floor(index / grid.columns)
              const column = index % grid.columns
              const cell = grid.cells[`${row}:${column}`] || { main: '', note: '' }
              const selected = grid.cursor.row === row && grid.cursor.column === column
              return (
                <button
                  key={`${row}:${column}`}
                  type="button"
                  data-cell={`${row}:${column}`}
                  tabIndex={selected && grid.status !== 'submitted' ? 0 : -1}
                  aria-label={`${selected ? 'Markerad ruta, ' : ''}rad ${row + 1}, kolumn ${column + 1}${cell.main ? `, ${cell.main}` : ', tom'}${cell.note ? `, anteckning ${cell.note}` : ''}`}
                  className={`diagnostic-cell ${selected ? 'diagnostic-cell--selected' : ''}`}
                  onClick={() => moveCursor({ row, column })}
                  onKeyDown={handleKeyDown}
                  disabled={grid.status === 'submitted'}
                >
                  <span className="diagnostic-cell__note">{cell.note}</span>
                  <span className="diagnostic-cell__main">{cell.main}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="mt-3 flex max-w-sm flex-wrap gap-2" role="group" aria-label="Inmatningsknappar för rutnätet">
          {GRID_KEYS.map(character => (
            <button key={character} type="button" onClick={() => writeCell(character)}
              disabled={grid.status === 'submitted' || (grid.cursor.layer === 'note' && !/^[0-9]$/u.test(character))}
              className="min-h-11 min-w-11 rounded-lg border border-slate-500 bg-slate-50 text-xl font-semibold disabled:opacity-40">
              {character}
            </button>
          ))}
          <button type="button" onClick={eraseCell} disabled={grid.status === 'submitted'}
            className="min-h-11 rounded-lg border border-slate-500 bg-slate-50 px-3 text-base font-semibold disabled:opacity-40">
            Radera
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-700">Markerad ruta: rad {grid.cursor.row + 1}, kolumn {grid.cursor.column + 1}, {grid.cursor.layer === 'note' ? 'anteckning' : 'stor siffra'}. Händelser: {grid.events.length}.</p>
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

      <section className="mt-5 rounded-2xl border border-slate-300 bg-white p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Kontrollera observationen</h2>
        <p className="mt-1 text-sm text-slate-700">Prototypen bedömer inte om svaret eller metoden är rätt.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={showSnapshot} className="rounded-lg bg-blue-700 px-4 py-2 text-white">Visa JSON</button>
          <button type="button" onClick={reloadSnapshot} disabled={!snapshotText.trim()} className="rounded-lg border border-blue-700 px-4 py-2 text-blue-800 disabled:opacity-50">Återläs JSON</button>
          <button type="button" onClick={() => record({ type: 'submit' })} disabled={grid.status === 'submitted'}
            className="rounded-lg border border-slate-500 px-4 py-2 disabled:opacity-50">Frys försöket</button>
        </div>
        <p className="mt-3 text-sm" role="status">{message || `Status: ${grid.status === 'submitted' ? 'fryst' : 'pågående'}`}</p>
        <label className="mt-3 block text-sm font-medium" htmlFor="diagnostic-snapshot">Arbetskopia av JSON för återläsning</label>
        <textarea id="diagnostic-snapshot" value={snapshotText} onChange={event => setSnapshotText(event.target.value)}
          className="mt-1 h-44 w-full rounded-lg border border-slate-400 p-3 font-mono text-xs" spellCheck="false" />
      </section>
    </main>
  )
}

export default DiagnosticGridPrototype
