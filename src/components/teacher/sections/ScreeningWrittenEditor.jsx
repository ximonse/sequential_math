import { useState } from 'react'
import { screeningAnswerKeyFromText, screeningAnswerKeyLabel } from '../../../domains/arithmetic/screeningAnswerKey.js'

const field = 'rounded border border-slate-400 px-1 py-0.5'
const empty = () => ({ prompt: '', format: 'number', keyText: '', unit: '', requireDenominator: false, gridEnabled: true })
const formats = { number: 'Tal', fraction: 'Bråkform', mixed: 'Blandad form', numbers: 'Flera tal i ordning', text: 'Bestämt textsvar' }

export default function ScreeningWrittenEditor({ tasks, onTasks, disabled, maxQuestions = 12 }) {
  const [draft, setDraft] = useState(empty)
  const [editing, setEditing] = useState(-1)
  const [error, setError] = useState('')
  const patch = value => { setDraft(previous => ({ ...previous, ...value })); setError('') }
  function save() {
    try {
      if (!draft.prompt.trim()) throw new Error('Skriv frågan först.')
      if (editing < 0 && tasks.length >= maxQuestions) throw new Error('Högst tolv egna frågor sammanlagt per samling.')
      const answerKey = screeningAnswerKeyFromText(draft.format, draft.keyText, draft.unit, draft.requireDenominator)
      const task = { promptSv: draft.prompt.trim(), answerKey, gridEnabled: draft.gridEnabled, drawingEnabled: false }
      onTasks(editing < 0 ? [...tasks, task] : tasks.map((previous, index) => index === editing ? task : previous))
      setDraft(empty()); setEditing(-1); setError('')
    } catch (failure) { setError(failure.message) }
  }
  function edit(task, index) {
    const { unit = '' } = task.answerKey
    const label = screeningAnswerKeyLabel(task.answerKey)
    setDraft({ prompt: task.promptSv, format: task.answerKey.format,
      keyText: task.answerKey.format === 'text' ? task.answerKey.expected.join('; ') : unit ? label.slice(0, -unit.length).trim() : label,
      unit, requireDenominator: task.answerKey.denominator !== undefined, gridEnabled: task.gridEnabled })
    setEditing(index); setError('')
  }
  return <details className="mt-3 text-sm">
    <summary className="cursor-pointer font-semibold">Egna frågor med automatisk rättning</summary>
    <fieldset disabled={disabled} className="mt-2 space-y-2">
      <legend className="sr-only">Egna självrättande frågor</legend>
      <ol className="list-decimal space-y-2 pl-5">{tasks.map((task, index) => <li key={index}>
        <p className="whitespace-pre-wrap">{task.promptSv}</p>
        <p>Facit: {screeningAnswerKeyLabel(task.answerKey)} · {formats[task.answerKey.format]}</p>
        <button type="button" className={field} onClick={() => edit(task, index)}>Redigera fråga {index + 1}</button>{' '}
        <button type="button" className={field} onClick={() => {
          onTasks(tasks.filter((_, i) => i !== index))
          if (editing === index) { setDraft(empty()); setEditing(-1) }
          else if (editing > index) setEditing(editing - 1)
        }}>Ta bort fråga {index + 1}</button>
      </li>)}</ol>
      <label className="block">Egen fråga<textarea className={`${field} block w-full`} maxLength={2000} value={draft.prompt} onChange={event => patch({ prompt: event.target.value })} /></label>
      <label className="block">Facitformat <select className={field} value={draft.format} onChange={event => patch({ format: event.target.value, keyText: '', unit: '', requireDenominator: false })}>
        {Object.entries(formats).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className="block">Facit <input className={field} value={draft.keyText} maxLength={200} onChange={event => patch({ keyText: event.target.value })} /></label>
      {draft.format === 'number' && <label className="block">Enhet (valfri) <input className={field} value={draft.unit} maxLength={20} onChange={event => patch({ unit: event.target.value })} /></label>}
      {draft.format === 'fraction' && <label className="block"><input type="checkbox" checked={draft.requireDenominator} onChange={event => patch({ requireDenominator: event.target.checked })} /> Svaret ska ha samma nämnare som facit</label>}
      {draft.format === 'numbers' && <p>Separera talen med semikolon, till exempel 0,45; 45. Eleven svarar i samma ordning.</p>}
      {draft.format === 'text' && <p>Rättar bara bestämda svar, inte resonemang. Separera likvärdiga textsvar med semikolon.</p>}
      <label className="block"><input type="checkbox" checked={draft.gridEnabled} onChange={event => patch({ gridEnabled: event.target.checked })} /> Räknehäfte till frågan</label>
      <p>Frågan och facit fryses när samlingen delas ut. Eleven får se frågan, inte facit. Förklaringen i räknehäftet behöver fortfarande granskas av läraren.</p>
      <button type="button" className={field} onClick={save}>{editing < 0 ? 'Lägg till självrättande fråga' : 'Spara ändrad fråga'}</button>
      {editing >= 0 && <button type="button" className={field} onClick={() => { setDraft(empty()); setEditing(-1); setError('') }}>Avbryt redigering</button>}
      <p role="status">{error || `${tasks.length} självrättande frågor tillagda.`}</p>
    </fieldset>
  </details>
}
