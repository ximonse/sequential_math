import { diagnosticCatalog } from '../../../domains/arithmetic/diagnosticCatalog.browser'
import QuestionText from '../../QuestionText'
import ScreeningQuestionPreview from './ScreeningQuestionPreview.jsx'

const writtenTasks = diagnosticCatalog.tasks.filter(task => !task.ncmCode)
const ncmPacks = diagnosticCatalog.packs.filter(pack => pack.id.startsWith('ncm-') && pack.id !== 'ncm-overview')
const findTask = diagnosticCatalog.findTask
const guideFor = diagnosticCatalog.guideFor
const originalGroups = [
  { label: 'Addition', tasks: writtenTasks.filter(task => task.operation === 'addition') },
  { label: 'Subtraktion', tasks: writtenTasks.filter(task => task.operation === 'subtraction') },
  { label: 'Geometri och bildfrågor', tasks: writtenTasks.filter(task => !['addition', 'subtraction'].includes(task.operation)) }
].filter(group => group.tasks.length)

// Question choice for a new collection. A pack covers the common case in one
// click; single questions, answer types and the teacher guide stay folded away.
export default function ScreeningTaskChoices({
  busy, selectedTasks, onSelectedTasks, usesNcm, selectedPack, itemOptions, onItemOptions,
  customPrompt, onCustomPrompt, customGrid, onCustomGrid, customDrawing, onCustomDrawing
}) {
  const taskCheckbox = task => <label key={task.taskId} className="flex items-center gap-1 text-sm">
    <input type="checkbox" checked={selectedTasks.includes(task.taskId)} onChange={event => onSelectedTasks(event.target.checked
      ? [...selectedTasks, task.taskId] : selectedTasks.filter(id => id !== task.taskId))} />
    {task.ncmCode ? `${task.ncmCode} ${task.ncmItem}: ` : ''}<QuestionText>{task.promptSv}</QuestionText>
  </label>

  return <>
    <label className="mt-2 block text-sm font-medium">Diagnospaket
      <select value={selectedPack?.id || ''} disabled={busy} onChange={event => {
        const pack = diagnosticCatalog.packs.find(item => item.id === event.target.value)
        if (pack) onSelectedTasks([...pack.taskIds])
      }} className="mt-1 block w-full rounded border border-slate-300 bg-white px-1.5 py-0.5">
        <option value="" disabled>Eget urval</option>
        {diagnosticCatalog.packs.map(pack => <option key={pack.id} value={pack.id}>{pack.labelSv}</option>)}
      </select>
    </label>
    <p className="mt-1 text-sm">{usesNcm
      ? 'Uppgifter ur NCM:s Diamant-diagnoser med NCM:s facit och analys. Svaren rättas automatiskt mot facit.'
      : 'Egna uppgifter för diagnostisk provning. Det här är inte ett originalprov från NCM.'} Valda uppgifter: {selectedTasks.length}.</p>

    {selectedTasks.some(id => findTask(id)?.responseMode) && <details className="mt-2 text-sm">
      <summary className="cursor-pointer font-semibold">Förhandsvisa valda bildfrågor</summary>
      {selectedTasks.map(findTask).filter(task => task?.responseMode).map(task => <ScreeningQuestionPreview key={task.taskId} task={task} />)}
    </details>}
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer font-semibold">Välj uppgifter en och en</summary>
      <fieldset className="mt-2" disabled={busy}>
        <legend className="font-medium">Uppgifter</legend>
        <div className="screening-task-groups">{originalGroups.map(group => <fieldset key={group.label}>
          <legend>{group.label} · {group.tasks.length} uppgifter</legend>
          <div className="screening-task-list">{group.tasks.map(taskCheckbox)}</div>
        </fieldset>)}</div>
        <details className="mt-2">
          <summary className="cursor-pointer font-semibold">NCM Diamant-uppgifter ({diagnosticCatalog.tasks.length - writtenTasks.length})</summary>
          {ncmPacks.map(pack => <div key={pack.id} className="mt-2">
            <p className="font-medium">{pack.labelSv.replace(/^NCM · /u, '')}</p>
            <div className="mt-1 flex flex-col gap-1">{pack.taskIds.map(id => taskCheckbox(findTask(id)))}</div>
          </div>)}
        </details>
      </fieldset>
    </details>

    <details className="mt-2 text-sm">
      <summary className="cursor-pointer font-semibold">Svarstyp och arbetsytor per fråga</summary>
      <fieldset className="mt-2 space-y-1" disabled={busy}>
        <legend className="sr-only">Svarstyp och arbetsytor per fråga</legend>
        {selectedTasks.map(id => {
          const options = itemOptions[id] || {}
          const change = patch => onItemOptions({ ...itemOptions, [id]: { ...itemOptions[id], ...patch } })
          const task = findTask(id)
          return <div key={id} className="flex flex-wrap items-center gap-x-2">
            <strong><QuestionText>{task?.promptSv}</QuestionText></strong>
            {/* NCM answers are marked against the facit, so their answer type is fixed. */}
            {task?.responseMode ? <span>{task.responseMode === 'text' ? 'Skrivsvar' : 'Val av alternativ'}</span> : task?.ncmCode ? <span className="text-slate-600">Facit: {task.facitSv}</span>
              : <label>Svarstyp <select value={options.answerType || 'number'} onChange={event => change({ answerType: event.target.value })} className="rounded border px-1 py-0.5">
                <option value="number">Siffersvar</option><option value="text">Skrivsvar</option>
              </select></label>}
            <label><input type="checkbox" disabled={Boolean(task?.responseMode)} checked={task?.responseMode ? false : options.gridEnabled !== false} onChange={event => change({ gridEnabled: event.target.checked })} /> Räknehäfte</label>
            <label><input type="checkbox" disabled={Boolean(task?.responseMode)} checked={Boolean(options.drawingEnabled)} onChange={event => change({ drawingEnabled: event.target.checked })} /> Rityta</label>
          </div>
        })}
      </fieldset>
    </details>

    <details className="mt-2 text-sm">
      <summary className="cursor-pointer font-semibold">Lägg till egen skrivfråga</summary>
      <label className="block">Frågetext<textarea value={customPrompt} maxLength={2000} onChange={event => onCustomPrompt(event.target.value)} className="mt-1 block w-full rounded border p-1" /></label>
      <p className="mt-1 text-slate-600">{'Bråk: skriv 6//2 eller \\frac{6}{2}.'}</p>
      {customPrompt.trim() && <div className="mt-2" role="region" aria-label="Förhandsvisning av frågan">
        <p className="font-semibold">Förhandsvisning</p>
        <p className="whitespace-pre-wrap break-words"><QuestionText>{customPrompt}</QuestionText></p>
      </div>}
      <label className="mr-2"><input type="checkbox" checked={customGrid} onChange={event => onCustomGrid(event.target.checked)} /> Räknehäfte till skrivfrågan</label>
      <label><input type="checkbox" checked={customDrawing} onChange={event => onCustomDrawing(event.target.checked)} /> Rityta till skrivfrågan</label>
    </details>

    <details className="mt-2 rounded border border-slate-300 bg-white p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Lärarstöd för valda uppgifter</summary>
      <p className="mt-2">Granska uppställningen och fråga eleven. Rätt slutsvar bevisar inte en viss metod. Appens automatiska metodanalys är begränsad.</p>
      <ol className="mt-2 list-decimal space-y-2 pl-5">
        {selectedTasks.map(findTask).filter(Boolean).map(task => <li key={task.taskId}>
          <strong><QuestionText>{task.promptSv}</QuestionText></strong> {guideFor(task)?.goalSv}. {guideFor(task)?.questionSv}
        </li>)}
      </ol>
    </details>
  </>
}
