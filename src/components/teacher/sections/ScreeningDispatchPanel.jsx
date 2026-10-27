import ScreeningImageEditor from './ScreeningImageEditor.jsx'
import ScreeningQuestionPreview from './ScreeningQuestionPreview.jsx'
import { useEffect, useState } from 'react'
import { diagnosticCatalog } from '../../../domains/arithmetic/diagnosticCatalog.browser'
import { diagnosticRequest as request } from './diagnosticRequest'
import QuestionText from '../../QuestionText'
import ScreeningTaskChoices from './ScreeningTaskChoices'
import { applyScreeningLimits, buildScreeningDispatches } from './screeningRecipients'
import '../../../dev/diagnosticGridPrototype.css'

const taskIds = diagnosticCatalog.tasks.map(task => task.taskId)
const findTask = diagnosticCatalog.findTask
const describeDispatch = item => item.wholeClass ? `${item.className} (hela klassen)`
  : `${item.className} (${item.studentIds.length} elev${item.studentIds.length === 1 ? '' : 'er'})`
const STEP = 'mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white'

// Sends a collection of questions to the recipients picked above. Results are
// read in the separate results view.
export default function ScreeningDispatchPanel({ classes, students, recipients = [], teacherGroups = [] }) {
  const [selectedTasks, setSelectedTasks] = useState([taskIds[0]])
  const [titleSv, setTitleSv] = useState('Screening')
  const [itemOptions, setItemOptions] = useState({})
  const [imageTasks, setImageTasks] = useState([])
  const [customPrompt, setCustomPrompt] = useState('')
  const [customGrid, setCustomGrid] = useState(false)
  const [customDrawing, setCustomDrawing] = useState(false)
  const [sourceClassId, setSourceClassId] = useState('')
  const [sourceAssignments, setSourceAssignments] = useState([])
  const [reuseAssignment, setReuseAssignment] = useState(null)
  const [loadingSource, setLoadingSource] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [limits, setLimits] = useState({})

  useEffect(() => {
    if (!sourceClassId) { setSourceAssignments([]); return undefined }
    let active = true
    setLoadingSource(true)
    void request(`/api/teacher-diagnostic-assignments?classId=${encodeURIComponent(sourceClassId)}`)
      .then(result => {
        if (!active) return
        if (!result.ok) throw new Error(result.data.error || 'Kunde inte hämta samlingar.')
        setSourceAssignments(result.data.assignments || [])
      })
      .catch(error => { if (active) setStatus(error.message || 'Kunde inte nå servern.') })
      .finally(() => { if (active) setLoadingSource(false) })
    return () => { active = false }
  }, [sourceClassId])

  const selectedPack = diagnosticCatalog.packs.find(pack => JSON.stringify(pack.taskIds) === JSON.stringify(selectedTasks))
  const usesNcm = selectedTasks.some(id => findTask(id)?.ncmCode)
  const hasTasks = reuseAssignment ? reuseAssignment.items.length > 0 : selectedTasks.length > 0 || imageTasks.length > 0 || Boolean(customPrompt.trim())
  const recipientPlan = buildScreeningDispatches(recipients, { classes, groups: teacherGroups, students })
  const limitCheck = applyScreeningLimits(recipientPlan.dispatches, limits)
  const pendingClassIds = limitCheck.pending.map(item => item.classId).join(',')

  // The server may only allow accounts on its test list, so check each picked
  // class before offering to send.
  useEffect(() => {
    if (!pendingClassIds) return undefined
    let active = true
    for (const pendingId of pendingClassIds.split(',')) {
      void request(`/api/teacher-diagnostic-assignments?classId=${encodeURIComponent(pendingId)}`).then(result => {
        if (!active) return
        const limit = result.status === 404 ? { unavailable: true }
          : result.ok ? { allowed: result.data.testStudentIds || [], wholeClassAvailable: Boolean(result.data.wholeClassAvailable) }
            : { allowed: [], wholeClassAvailable: false }
        setLimits(previous => ({ ...previous, [pendingId]: limit }))
      }).catch(() => {})
    }
    return () => { active = false }
  }, [pendingClassIds])

  function postAssignment(targetClassId, audience) {
    if (reuseAssignment) return request('/api/teacher-diagnostic-assignments', { method: 'POST',
      body: JSON.stringify({ classId: targetClassId, ...audience, titleSv,
        sourceClassId: reuseAssignment.classId || sourceClassId, sourceAssignmentId: reuseAssignment.assignmentId }) })
    return request('/api/teacher-diagnostic-assignments', { method: 'POST',
      body: JSON.stringify({ classId: targetClassId, ...audience,
        taskIds: selectedTasks, titleSv, itemOptions: Object.fromEntries(selectedTasks.filter(id => itemOptions[id]).map(id => [id, itemOptions[id]])),
        customTasks: [...imageTasks, ...(customPrompt.trim() ? [{ promptSv: customPrompt, gridEnabled: customGrid, drawingEnabled: customDrawing }] : [])] }) })
  }

  function reuseCollection(assignment) {
    setReuseAssignment(assignment)
    if (assignment) setTitleSv(assignment.titleSv || 'Screening')
  }

  async function createForRecipients() {
    if (!limitCheck.ready.length || limitCheck.pending.length || !hasTasks || busy) return
    setBusy(true)
    const done = []
    const failed = []
    for (const dispatch of limitCheck.ready) {
      try {
        const result = await postAssignment(dispatch.classId, dispatch.wholeClass ? { audience: 'class' } : { studentIds: dispatch.studentIds })
        if (!result.ok) throw new Error(result.data.error || 'Kunde inte skapa screeningen.')
        const count = result.data.assignment.studentIds.length
        done.push(`${dispatch.className} (${count} ${count === 1 ? 'elev' : 'elever'})`)
        if (dispatch.classId === sourceClassId) setSourceAssignments(previous => [result.data.assignment, ...previous])
      } catch (error) {
        failed.push(`${dispatch.className}: ${error.message || 'Kunde inte nå servern.'}`)
      }
    }
    setStatus([done.length ? `Screening skapad för ${done.join(', ')}.` : '', failed.length ? `Misslyckades för ${failed.join('; ')}` : '']
      .filter(Boolean).join(' '))
    setBusy(false)
  }

  return <section aria-labelledby="screening-dispatch-title" className="mt-4 rounded-lg border border-slate-300 bg-white p-3 shadow-sm">
    <h2 id="screening-dispatch-title" className="text-lg font-semibold text-slate-800">Dela ut screening</h2>
    <p className="mt-1 text-sm text-slate-800">Välj klasser, grupper eller elever i rutan Mottagare överst. Det sparas separat från vanlig träning. Svaren läser du under Screening: resultat.</p>

    <h3 className="mt-4 flex items-center font-semibold text-slate-800"><span className={STEP}>1</span>Samling</h3>
    <label className="mt-2 block text-sm font-semibold">Samlingens namn
      <input value={titleSv} maxLength={100} onChange={event => setTitleSv(event.target.value)}
        className="ml-2 rounded border border-slate-400 px-2 py-1" placeholder="Exempel: Läxa vecka 42" />
    </label>
    <details className="mt-2 text-sm" open={Boolean(reuseAssignment)}>
      <summary className="cursor-pointer font-semibold">Återanvänd en tidigare samling</summary>
      <label className="mt-2 block font-medium">Klass att hämta samlingar från
        <select value={sourceClassId} onChange={event => { setSourceClassId(event.target.value); reuseCollection(null) }}
          className="mt-1 block w-full rounded border border-slate-300 bg-white px-1.5 py-0.5">
          <option value="">Välj klass</option>
          {classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="mt-2 block font-semibold">Återanvänd samling
        <select value={reuseAssignment?.assignmentId || ''} disabled={busy || loadingSource}
          onChange={event => reuseCollection(sourceAssignments.find(item => item.assignmentId === event.target.value) || null)}
          className="mt-1 block w-full rounded border border-slate-300 bg-white px-1.5 py-0.5">
          <option value="">Skapa en ny samling</option>
          {sourceAssignments.map(item => <option key={item.assignmentId} value={item.assignmentId}>
            {item.titleSv || 'Screening'} · {item.items.length} frågor · {new Date(item.createdAt).toLocaleString('sv-SE')}
          </option>)}
        </select>
      </label>
      <p className="mt-1 text-xs text-slate-600">Frågor, ordning och arbetsytor följer med. Mottagarna väljs i rutan överst och får en ny kopia.</p>
    </details>
    {reuseAssignment && <section className="mt-3 text-sm" aria-label="Samling att återanvända">
      <p className="font-semibold">{reuseAssignment.items.length} frågor att dela ut igen</p>
      <p>Frågornas ordning, svarstyper och arbetsytor följer med. Tidigare elevsvar stannar i den gamla utdelningen.</p>
      <ol className="mt-2 list-inside list-decimal space-y-1">{reuseAssignment.items.map(item => {
        const task = item.taskSnapshot || findTask(item.taskId)
        return <li key={item.assignmentItemId}><QuestionText>{task?.promptSv || item.taskId}</QuestionText>
          <span className="ml-2 text-slate-600">{{ single: 'Välj en bild', multiple: 'Välj flera bilder', name: 'Välj namn', text: 'Skrivsvar' }[task?.responseMode] || (task?.answerType === 'text' ? 'Skrivsvar' : 'Siffersvar')}
            {task?.gridEnabled !== false ? ' · Räknehäfte' : ''}{task?.drawingEnabled ? ' · Rityta' : ''}</span>
        </li>
      })}</ol>
      {reuseAssignment.items.some(item => item.taskSnapshot?.responseMode) && <details className="mt-2">
        <summary className="cursor-pointer font-semibold">Förhandsvisa samlingens bildfrågor</summary>
        {reuseAssignment.items.filter(item => item.taskSnapshot?.responseMode).map(item => <ScreeningQuestionPreview key={item.assignmentItemId}
          task={item.taskSnapshot} context={{ teacher: true, classId: sourceClassId, assignmentId: reuseAssignment.assignmentId }} />)}
      </details>}
    </section>}

    {!reuseAssignment && <>
      <h3 className="mt-4 flex items-center font-semibold text-slate-800"><span className={STEP}>2</span>Uppgifter</h3>
      <ScreeningTaskChoices busy={busy} selectedTasks={selectedTasks} onSelectedTasks={setSelectedTasks} usesNcm={usesNcm} selectedPack={selectedPack}
        itemOptions={itemOptions} onItemOptions={setItemOptions}
        customPrompt={customPrompt} onCustomPrompt={setCustomPrompt} customGrid={customGrid} onCustomGrid={setCustomGrid}
        customDrawing={customDrawing} onCustomDrawing={setCustomDrawing} />
      <ScreeningImageEditor tasks={imageTasks} onTasks={setImageTasks} disabled={busy} />
    </>}

    <h3 className="mt-4 flex items-center font-semibold text-slate-800"><span className={STEP}>{reuseAssignment ? 2 : 3}</span>Skicka</h3>
    <div data-screening-recipients className="mt-2 rounded border border-indigo-200 bg-indigo-50 p-2 text-sm">
      <p>{recipientPlan.dispatches.length
        ? `Valda mottagare ger ${recipientPlan.dispatches.length} screening${recipientPlan.dispatches.length === 1 ? '' : 'ar'}, en per klass: ${recipientPlan.dispatches.map(describeDispatch).join(', ')}.`
        : 'Välj klasser, grupper eller elever i rutan Mottagare överst.'}</p>
      {recipientPlan.withoutClass.length > 0 && <p className="mt-1">Utan klass, får ingen screening: {recipientPlan.withoutClass.join(', ')}.</p>}
      {limitCheck.blocked.map(item => <p key={`${item.classId}-${item.reason}`} className="mt-1 text-amber-900">
        {item.className}: {item.reason}{item.wholeClass ? '' : ` (${item.studentIds.length} elev${item.studentIds.length === 1 ? '' : 'er'})`}. De får ingen screening.
      </p>)}
      {limitCheck.pending.length > 0 && <p className="mt-1 text-slate-600">Kontrollerar vilka elever som kan få screening…</p>}
      {recipientPlan.dispatches.length > 0 && <button type="button" onClick={createForRecipients}
        disabled={!hasTasks || busy || limitCheck.pending.length > 0 || limitCheck.ready.length === 0}
        className="mt-2 rounded bg-indigo-600 px-3 py-1 font-semibold text-white disabled:opacity-50">
        {busy ? 'Skapar...' : `Ge till valda mottagare (${limitCheck.ready.length} screening${limitCheck.ready.length === 1 ? '' : 'ar'})`}
      </button>}
    </div>
    <p className="mt-2 text-sm" role="status">{status}</p>
  </section>
}
