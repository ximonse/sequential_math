import { useEffect, useState } from 'react'
import { diagnosticCatalog } from '../../../domains/arithmetic/diagnosticCatalog.browser'
import useScreeningDelivery from './useScreeningDelivery'
import { applyScreeningLimits } from './screeningRecipients'
import { resolveScreeningRecipients } from './recipientSelection'
import ScreeningRecipientPicker from './ScreeningRecipientPicker'
import ScreeningTaskChoices from './ScreeningTaskChoices'
import ScreeningImageEditor from './ScreeningImageEditor'
import ScreeningWrittenEditor from './ScreeningWrittenEditor'
import ScreeningDraftsPanel from './ScreeningDraftsPanel'
import ScreeningDraftPreview from './ScreeningDraftPreview'
import useScreeningDraft from './useScreeningDraft'
import ScreeningQuestionPreview from './ScreeningQuestionPreview'
import QuestionText from '../../QuestionText'
import '../../../dev/diagnosticGridPrototype.css'

const button = 'rounded border border-slate-400 px-2 py-0.5 text-sm disabled:opacity-50'
const primary = `${button} border-indigo-600 bg-indigo-600 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700`

export default function ScreeningDispatchFlow({ context, library, initialSource, onClose, onDirtyChange }) {
  const { draft, setDraft, busy: draftBusy, setBusy: setDraftBusy, dirty: draftDirty, setDirty: setDraftDirty } = useScreeningDraft()
  const [step, setStep] = useState(initialSource ? 'content' : 'start')
  const [mode, setMode] = useState(initialSource ? 'reuse' : null)
  const [source, setSource] = useState({ classId: initialSource?.classId || '', assignment: initialSource || null, title: initialSource?.titleSv || '' })
  const [recipients, setRecipients] = useState([])
  const { delivery, busy, send } = useScreeningDelivery(library.reload)
  const patch = value => setDraft(previous => ({ ...previous, ...value }))
  const updateEditor = field => value => setDraft(previous => ({ ...previous,
    [field]: typeof value === 'function' ? value(previous[field]) : value }))
  const reuse = mode === 'reuse'
  const title = reuse ? source.title : draft.titleSv
  const plan = resolveScreeningRecipients(recipients, context)
  const limits = applyScreeningLimits(plan.dispatches, library.loaded)
  const customTasks = [...draft.writtenTasks, ...draft.imageTasks, ...(draft.customPrompt.trim() ? [{ promptSv: draft.customPrompt, gridEnabled: draft.customGrid, drawingEnabled: draft.customDrawing }] : [])]
  const tasks = reuse ? (source.assignment?.items || []).map(item => item.taskSnapshot || diagnosticCatalog.findTask(item.taskId))
    : [...draft.selectedTasks.map(id => ({ ...diagnosticCatalog.findTask(id), ...draft.itemOptions[id] })), ...customTasks]
  const validContent = title.trim().length > 0 && tasks.length > 0 && (reuse ? Boolean(source.assignment) : customTasks.length <= 12)
  const recipientIssue = plan.withoutClass.length > 0 || plan.missing > 0 || plan.unavailablePupils > 0
    || limits.blocked.length > 0 || plan.dispatches.some(item => library.loaded[item.classId]?.error)
  const canReview = validContent && plan.pupils.length > 0 && !recipientIssue && !limits.pending.length
  const selectedPack = diagnosticCatalog.packs.find(pack => JSON.stringify(pack.taskIds) === JSON.stringify(draft.selectedTasks))
  const draftContent = { titleSv: draft.titleSv, selectedTasks: draft.selectedTasks,
    itemOptions: Object.fromEntries(draft.selectedTasks.filter(id => draft.itemOptions[id]).map(id => [id, draft.itemOptions[id]])),
    writtenTasks: draft.writtenTasks, imageTasks: draft.imageTasks, customPrompt: draft.customPrompt,
    customGrid: draft.customGrid, customDrawing: draft.customDrawing, writtenEditor: draft.writtenEditor, imageEditor: draft.imageEditor }

  const unresolvedDelivery = Boolean(delivery && delivery.dispatches.some(item => !delivery.results[item.classId]?.ok))
  const unsaved = busy || draftBusy || unresolvedDelivery || (step !== 'receipt'
    && (recipients.length > 0 || (reuse ? Boolean(source.assignment) : draftDirty)))
  useEffect(() => { onDirtyChange(unsaved) }, [unsaved, onDirtyChange])
  useEffect(() => {
    if (!unsaved) return undefined
    const beforeUnload = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [unsaved])

  function startDelivery() {
    if (!canReview || busy) return
    const snapshot = { requestId: crypto.randomUUID(), title, recipients: plan.selected.map(item => item.name),
      dispatches: structuredClone(plan.dispatches), total: plan.pupils.length, results: {},
      payload: reuse ? { sourceClassId: source.classId, sourceAssignmentId: source.assignment.assignmentId, titleSv: title }
        : { titleSv: title, taskIds: [...draft.selectedTasks], itemOptions: structuredClone(draft.itemOptions), customTasks: structuredClone(customTasks) } }
    setStep('receipt')
    void send(snapshot)
  }

  const completed = delivery && delivery.dispatches.every(item => delivery.results[item.classId]?.ok)
  const steps = ['content', 'recipients', 'review']
  const names = ['Innehåll', 'Mottagare och inställningar', 'Kontrollera och dela ut']
  return <div className="mt-3 text-sm">
    {step !== 'start' && step !== 'receipt' && <ol aria-label="Utdelningsflöde" className="mb-3 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600">{steps.map((value, index) => <li key={value} aria-current={step === value ? 'step' : undefined} className={`rounded px-1.5 py-0.5 ${step === value ? 'bg-indigo-50 font-semibold text-indigo-700' : ''}`}>{index + 1}. {names[index]}</li>)}</ol>}
    <div hidden={step !== 'start'}>
      <h3 className="font-semibold">Vad vill du dela ut?</h3>
      <div className="my-2 grid gap-2 sm:grid-cols-2">
        <button type="button" className={`${button} bg-white p-2 text-left`} onClick={() => { setMode('reuse'); setStep('content') }}><strong className="block">Återanvänd</strong><span>Välj tidigare innehåll till en ny utdelning.</span></button>
        <button type="button" className={`${button} bg-white p-2 text-left`} onClick={() => { setMode('new'); setStep('content') }}><strong className="block">Skapa ny</strong><span>Välj uppgifter och lägg till egna frågor.</span></button>
      </div>
      <button type="button" className={button} onClick={onClose}>Till utdelade screeningar</button>
    </div>

    <div hidden={step !== 'content'}>
      <h3 className="mb-1 font-semibold">{reuse ? 'Återanvänd en tidigare screening' : 'Skapa en ny screening'}</h3>
      {reuse && <div className="space-y-2">
        <label className="block">Klass att hämta samlingar från<select value={source.classId} onChange={event => setSource({ classId: event.target.value, assignment: null, title: '' })} className="block w-full rounded border border-slate-400 px-1 py-0.5">
          <option value="">Välj klass</option>{context.classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label className="block">Återanvänd samling<select value={source.assignment?.assignmentId || ''} disabled={!source.classId || !library.loaded[source.classId]}
          onChange={event => { const assignment = library.loaded[source.classId]?.assignments.find(item => item.assignmentId === event.target.value); setSource(previous => ({ ...previous, assignment: assignment || null, title: assignment?.titleSv || '' })) }}
          className="block w-full rounded border border-slate-400 px-1 py-0.5">
          <option value="">Välj samling</option>{(library.loaded[source.classId]?.assignments || []).map(item => <option key={item.assignmentId} value={item.assignmentId}>{item.titleSv} · {item.items.length} frågor · {new Date(item.createdAt).toLocaleDateString('sv-SE')}</option>)}
        </select></label>
        {source.classId && library.loaded[source.classId]?.error && <p role="alert">{library.loaded[source.classId].error} <button type="button" className="underline" onClick={library.reload}>Läs om</button></p>}
        {source.assignment && <><label className="block">Samlingens namn<input value={source.title} maxLength={100} onChange={event => setSource(previous => ({ ...previous, title: event.target.value }))} className="ml-2 rounded border border-slate-400 px-1 py-0.5" /></label>
          <p>{tasks.length} {tasks.length === 1 ? 'fråga' : 'frågor'} att dela ut igen</p><p>Frågor, ordning och arbetsytor kopieras. Tidigare elevsvar stannar i den gamla utdelningen.</p>
          <details><summary className="cursor-pointer">Visa frågor och arbetsytor</summary><QuestionList tasks={tasks} context={{ teacher: true, classId: source.classId, assignmentId: source.assignment.assignmentId }} /></details></>}
      </div>}
      {/* Keep the editors mounted while navigating so unfinished question drafts survive. */}
      <div hidden={reuse}>
        <ScreeningDraftsPanel content={draftContent} onLoad={setDraft} disabled={busy || reuse} onBusy={setDraftBusy} onDirtyChange={setDraftDirty} />
        <fieldset disabled={busy || draftBusy} className="min-w-0">
        <label className="block">Samlingens namn<input value={draft.titleSv} maxLength={100} onChange={event => patch({ titleSv: event.target.value })} className="ml-2 rounded border border-slate-400 px-1 py-0.5" /></label>
        <ScreeningTaskChoices busy={busy} selectedTasks={draft.selectedTasks} onSelectedTasks={selectedTasks => patch({ selectedTasks })}
          usesNcm={draft.selectedTasks.some(id => diagnosticCatalog.findTask(id)?.ncmCode)} selectedPack={selectedPack}
          itemOptions={draft.itemOptions} onItemOptions={itemOptions => patch({ itemOptions })}
          customPrompt={draft.customPrompt} onCustomPrompt={customPrompt => patch({ customPrompt })} customGrid={draft.customGrid} onCustomGrid={customGrid => patch({ customGrid })}
          customDrawing={draft.customDrawing} onCustomDrawing={customDrawing => patch({ customDrawing })} />
        <ScreeningImageEditor tasks={draft.imageTasks} onTasks={imageTasks => patch({ imageTasks })} disabled={busy}
          editorState={draft.imageEditor} onEditorState={updateEditor('imageEditor')} />
        <ScreeningWrittenEditor tasks={draft.writtenTasks} onTasks={writtenTasks => patch({ writtenTasks })} disabled={busy} maxQuestions={12 - draft.imageTasks.length - (draft.customPrompt.trim() ? 1 : 0)}
          editorState={draft.writtenEditor} onEditorState={updateEditor('writtenEditor')} />
        <ScreeningDraftPreview content={draftContent} />
        {customTasks.length > 12 && <p role="alert" className="mt-1 text-amber-900">Högst tolv egna frågor sammanlagt. Ta bort frågor innan utdelning.</p>}
        </fieldset>
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-2">
        <button type="button" className={button} onClick={() => setStep('start')}>Tillbaka</button>
        <button type="button" className={primary} disabled={!validContent || draftBusy} onClick={() => setStep('recipients')}>Välj mottagare</button>
      </div>
    </div>

    <div hidden={step !== 'recipients'}>
      <p className="mb-1">Kombinera klasser, grupper och enskilda elever. Överlappande urval ger en utdelning per elev.</p>
      <ScreeningRecipientPicker {...context} recipients={recipients} onChange={setRecipients} disabled={busy} />
      {plan.withoutClass.length > 0 && <p role="alert" className="mt-1 text-amber-900">Elever utan tillgänglig klass: {plan.withoutClass.join(', ')}. Ändra urvalet innan utdelning.</p>}
      {limits.blocked.map(item => <p key={item.classId} role="alert" className="mt-1 text-amber-900">{item.className}: {library.loaded[item.classId]?.error || item.reason}. Ändra urvalet eller <button type="button" className="underline" onClick={library.reload}>läs om underlaget</button>.</p>)}
      {limits.pending.length > 0 && <p role="status">Kontrollerar vilka elever som kan få screening…</p>}
      <div className="mt-2 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-2">
        <button type="button" className={button} onClick={() => setStep('content')}>Tillbaka</button>
        <button type="button" className={primary} disabled={!canReview} onClick={() => setStep('review')}>Kontrollera utdelningen</button>
      </div>
    </div>

    {step === 'review' && <div>
      <h3 className="font-semibold">Kontrollera innan du delar ut</h3>
      <dl className="my-1 divide-y divide-slate-200">
        <div className="grid gap-x-2 py-1 sm:grid-cols-[7rem_1fr]"><dt>Innehåll</dt><dd>{title} · {tasks.length} frågor <button type="button" className="ml-2 text-indigo-700 underline" onClick={() => setStep('content')}>Ändra innehåll</button><details><summary className="cursor-pointer">Visa alla frågor</summary><QuestionList tasks={tasks} context={reuse ? { teacher: true, classId: source.classId, assignmentId: source.assignment.assignmentId } : undefined} /></details></dd></div>
        <div className="grid gap-x-2 py-1 sm:grid-cols-[7rem_1fr]"><dt>Mottagare</dt><dd>{plan.selected.map(item => item.name).join(', ')}<p className="font-semibold">{plan.pupils.length} unika elever</p>
          <details><summary className="cursor-pointer">Visa elever och klasser</summary>{plan.dispatches.map(item => <p key={item.classId}>{item.className}: {item.studentIds.map(id => context.students.find(student => student.studentId === id)?.name || 'Elev utan namn').join(', ')}</p>)}</details>
          <button type="button" className="text-indigo-700 underline" onClick={() => setStep('recipients')}>Ändra mottagare</button></dd></div>
      </dl>
      <p className="mt-1 text-slate-600">En ny utdelning sparas separat från vanlig träning. Tidigare screeningar och elevsvar ligger kvar.</p>
      {!canReview && <p role="alert" className="text-amber-900">Underlaget har ändrats eller är inte tillgängligt. Kontrollera innehåll och mottagare igen.</p>}
      <div className="mt-2 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-2">
        <button type="button" className={button} onClick={() => setStep('recipients')}>Tillbaka</button>
        <button type="button" className={primary} disabled={!canReview || busy} onClick={startDelivery}>Dela ut till {plan.pupils.length} {plan.pupils.length === 1 ? 'elev' : 'elever'}</button>
      </div>
    </div>}
    {step === 'receipt' && delivery && <div aria-label="Utdelningskvitto" role="region">
      <h3 className="font-semibold">{busy ? 'Delar ut…' : 'Utdelningskvitto'}</h3>
      <p>{delivery.title}</p>
      <p role="status">{completed ? delivery.total === 1 ? 'Eleven har fått screeningen.' : `Alla ${delivery.total} elever har fått screeningen.` : 'Kontrollera kvittot för varje klass innan du går vidare.'}</p>
      <ul className="my-2 divide-y divide-slate-200">{delivery.dispatches.map(item => <li key={item.classId} className="py-1">
        <strong>{item.className}</strong>: {delivery.results[item.classId]?.ok ? `Bekräftat · ${delivery.results[item.classId].count} ${delivery.results[item.classId].count === 1 ? 'elev' : 'elever'}` : delivery.results[item.classId]?.message || 'Väntar på kvittens…'}
      </li>)}</ul>
      <div className="flex flex-wrap gap-2">{!completed && <button type="button" disabled={busy} className={primary} onClick={() => send(delivery)}>Försök igen för obekräftade klasser</button>}
        <button type="button" disabled={busy} className={button} onClick={onClose}>Till utdelade screeningar</button></div>
    </div>}
  </div>
}

function QuestionList({ tasks, context }) {
  return <ol className="my-1 list-decimal space-y-1 pl-5">{tasks.filter(Boolean).map((task, index) => <li key={index}>
    <QuestionText>{task.promptSv}</QuestionText><span className="ml-2 text-xs text-slate-600">{task.gridEnabled !== false && !task.responseMode ? 'Räknehäfte' : 'Utan räknehäfte'}{task.drawingEnabled ? ' · Rityta' : ''}</span>
    {task.responseMode && <ScreeningQuestionPreview task={task} context={context} />}
  </li>)}</ol>
}
