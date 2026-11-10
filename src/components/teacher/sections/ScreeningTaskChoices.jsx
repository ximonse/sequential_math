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
  { label: 'Multiplikation', tasks: writtenTasks.filter(task => task.operation === 'multiplication') },
  { label: 'Division', tasks: writtenTasks.filter(task => task.operation === 'division') },
  { label: 'Geometri och bildfrågor', tasks: writtenTasks.filter(task => !['addition', 'subtraction', 'multiplication', 'division'].includes(task.operation)) }
].filter(group => group.tasks.length)

// Question choice for a new collection. A pack covers the common case in one
// click; single questions and the teacher guide stay folded away.
export default function ScreeningTaskChoices({
  busy, selectedTasks, onSelectedTasks, usesNcm, selectedPack,
  customPrompt, onCustomPrompt, customGrid, onCustomGrid, customDrawing, onCustomDrawing, showCustomQuestion = true, showTeacherSupport = true
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
        <div className="screening-task-groups">{originalGroups.map(group => <details key={group.label} className="mt-1">
          <summary className="cursor-pointer">{group.label} · {group.tasks.length} uppgifter</summary>
          <div className="screening-task-list">{group.tasks.map(taskCheckbox)}</div>
        </details>)}</div>
        <details className="mt-2">
          <summary className="cursor-pointer font-semibold">NCM Diamant-uppgifter ({diagnosticCatalog.tasks.length - writtenTasks.length})</summary>
          <div className="screening-task-groups mt-1">
            {ncmPacks.map(pack => <details key={pack.id} className="mt-1">
              <summary className="cursor-pointer font-medium">{pack.labelSv.replace(/^NCM · /u, '')} · {pack.taskIds.length} uppgifter</summary>
              <div className="screening-task-list mt-1 flex flex-col gap-1">{pack.taskIds.map(id => taskCheckbox(findTask(id)))}</div>
            </details>)}
          </div>
        </details>
      </fieldset>
    </details>

    {showCustomQuestion && <details className="mt-2 text-sm">
      <summary className="cursor-pointer font-semibold">Lägg till egen skrivfråga</summary>
      <label className="block">Frågetext<textarea value={customPrompt} maxLength={2000} onChange={event => onCustomPrompt(event.target.value)} className="mt-1 block w-full rounded border p-1" /></label>
      <p className="mt-1 text-slate-600">{'Bråk: skriv 6//2 eller \\frac{6}{2}.'}</p>
      {customPrompt.trim() && <div className="mt-2" role="region" aria-label="Förhandsvisning av frågan">
        <p className="font-semibold">Förhandsvisning</p>
        <p className="whitespace-pre-wrap break-words"><QuestionText>{customPrompt}</QuestionText></p>
      </div>}
      <label className="mr-2"><input type="checkbox" checked={!customGrid} onChange={event => onCustomGrid(!event.target.checked)} /> Huvudräkning för skrivfrågan</label>
      <label><input type="checkbox" checked={customDrawing} onChange={event => onCustomDrawing(event.target.checked)} /> Rityta till skrivfrågan</label>
    </details>}

    {showTeacherSupport && <ScreeningTeacherSupport selectedTasks={selectedTasks} />}
  </>
}

// What to look for and ask about, for the chosen bank questions.
export function ScreeningTeacherSupport({ selectedTasks }) {
  return <details className="mt-2 text-sm">
    <summary className="cursor-pointer font-semibold">Lärarstöd för valda bankfrågor</summary>
    <p className="mt-2">Granska uppställningen och fråga eleven. Rätt slutsvar bevisar inte en viss metod. Appens automatiska metodanalys är begränsad.</p>
    {selectedTasks.length ? <ol className="mt-2 list-decimal space-y-2 pl-5">
      {selectedTasks.map(findTask).filter(Boolean).map(task => <li key={task.taskId}>
        <strong><QuestionText>{task.promptSv}</QuestionText></strong> {guideFor(task)?.goalSv}. {guideFor(task)?.questionSv}
      </li>)}
    </ol> : <p className="mt-1 screening-note">Välj frågor ur frågebanken för att få stöd till dem.</p>}
  </details>
}
