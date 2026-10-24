import { useEffect, useRef, useState } from 'react'
import { diagnosticCatalog } from '../../../domains/arithmetic/diagnosticCatalog.browser'
import { diagnosticRequest as request } from './diagnosticRequest'
import DiagnosticClassReviewPanel from './DiagnosticClassReviewPanel'
import DiagnosticEvidenceDetails from './DiagnosticEvidenceDetails'
import { applyScreeningLimits, buildScreeningDispatches } from './screeningRecipients'
import '../../../dev/diagnosticGridPrototype.css'

const taskIds = diagnosticCatalog.tasks.map(task => task.taskId)
const writtenTasks = diagnosticCatalog.tasks.filter(task => !task.ncmCode)
const ncmPacks = diagnosticCatalog.packs.filter(pack => pack.id.startsWith('ncm-') && pack.id !== 'ncm-overview')
const findTask = diagnosticCatalog.findTask
const describeDispatch = item => item.wholeClass ? `${item.className} (hela klassen)`
  : `${item.className} (${item.studentIds.length} elev${item.studentIds.length === 1 ? '' : 'er'})`

export default function DiagnosticPilotAssignmentPanel({ classes, students, recipients = [], teacherGroups = [] }) {
  const [view, setView] = useState('dispatch')
  const [classId, setClassId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [selectedTasks, setSelectedTasks] = useState([taskIds[0]])
  const [titleSv, setTitleSv] = useState('Screening')
  const [itemOptions, setItemOptions] = useState({})
  const [customPrompt, setCustomPrompt] = useState('')
  const [customGrid, setCustomGrid] = useState(false)
  const [customDrawing, setCustomDrawing] = useState(false)
  const [testStudentIds, setTestStudentIds] = useState([])
  const [assignments, setAssignments] = useState([])
  const [status, setStatus] = useState('Välj en klass för att se eleverna.')
  const [busy, setBusy] = useState(false)
  const [attempts, setAttempts] = useState([])
  const [attemptStatus, setAttemptStatus] = useState('')
  const [detail, setDetail] = useState(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [limits, setLimits] = useState({})
  const selectionRef = useRef('')
  const reviewDirty = useRef(false)
  selectionRef.current = `${classId}:${studentId}`

  useEffect(() => {
    if (!classId) return undefined
    let active = true
    setStudentId('')
    setAssignments([])
    setStatus('Hämtar klasslistan...')
    void request(`/api/teacher-diagnostic-assignments?classId=${encodeURIComponent(classId)}`)
      .then(result => {
        if (!active) return
        if (result.status === 404) {
          setTestStudentIds([])
          setStatus('Diagnostikens testläge är ännu inte aktiverat på servern.')
          return
        }
        if (!result.ok) throw new Error(result.data.error || 'Kunde inte hämta tilldelningar.')
        setTestStudentIds(result.data.testStudentIds || [])
        setAssignments(result.data.assignments || [])
        setStatus(result.data.testStudentIds?.length
          ? 'Välj en elev för att se elevens svar.'
          : 'Inga elever kan tilldelas i den här klassen.')
      })
      .catch(error => { if (active) setStatus(error.message || 'Kunde inte nå servern.') })
    return () => { active = false }
  }, [classId])

  useEffect(() => {
    setDetail(null)
    if (!classId || !studentId) { setAttempts([]); setAttemptStatus(''); return undefined }
    let active = true
    const pupilAssignments = assignments.filter(assignment => assignment.studentIds?.includes(studentId))
    setAttemptStatus('Hämtar sparade försök...')
    void Promise.all(pupilAssignments.map(async assignment => {
      const search = new URLSearchParams({ classId, studentId, assignmentId: assignment.assignmentId })
      const result = await request(`/api/teacher-diagnostic-attempts?${search}`)
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte hämta elevens försök.')
      return (result.data.attempts || []).map(attempt => ({ ...attempt, assignmentId: assignment.assignmentId }))
    })).then(groups => {
      if (!active) return
      const found = groups.flat()
      setAttempts(found)
      setAttemptStatus(found.length ? '' : 'Eleven har ännu inget sparat försök.')
    }).catch(error => { if (active) setAttemptStatus(error.message || 'Kunde inte hämta försök.') })
    return () => { active = false }
  }, [classId, studentId, assignments, refreshVersion])

  // The server decides who may be assigned: the whole class roster, or only the
  // accounts named in NCM_DIAGNOSTIC_TEST_STUDENT_IDS when that list is set.
  const pupils = students.filter(student => testStudentIds.includes(student.studentId)
    && [student.classId, ...(student.classIds || [])].includes(classId))
  const selectedPack = diagnosticCatalog.packs.find(pack => JSON.stringify(pack.taskIds) === JSON.stringify(selectedTasks))
  const guideFor = diagnosticCatalog.guideFor
  const usesNcm = selectedTasks.some(id => findTask(id)?.ncmCode)
  const taskCheckbox = task => <label key={task.taskId} className="flex items-center gap-1 text-sm">
    <input type="checkbox" checked={selectedTasks.includes(task.taskId)} onChange={event => setSelectedTasks(previous => event.target.checked
      ? [...previous, task.taskId] : previous.filter(id => id !== task.taskId))} />
    {task.ncmCode ? `${task.ncmCode} ${task.ncmItem}: ` : ''}{task.promptSv}
  </label>

  const hasTasks = selectedTasks.length > 0 || Boolean(customPrompt.trim())
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
    return request('/api/teacher-diagnostic-assignments', { method: 'POST',
      body: JSON.stringify({ classId: targetClassId, ...audience,
        taskIds: selectedTasks, titleSv, itemOptions: Object.fromEntries(selectedTasks.filter(id => itemOptions[id]).map(id => [id, itemOptions[id]])),
        customTasks: customPrompt.trim() ? [{ promptSv: customPrompt, gridEnabled: customGrid, drawingEnabled: customDrawing }] : [] }) })
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
        if (dispatch.classId === classId) setAssignments(previous => [result.data.assignment, ...previous])
      } catch (error) {
        failed.push(`${dispatch.className}: ${error.message || 'Kunde inte nå servern.'}`)
      }
    }
    setStatus([done.length ? `Screening skapad för ${done.join(', ')}.` : '', failed.length ? `Misslyckades för ${failed.join('; ')}` : '']
      .filter(Boolean).join(' '))
    setBusy(false)
  }

  async function stopAssignment(assignment) {
    const title = assignment.titleSv || 'Screening'
    if (busy || (assignment.status === 'active' && !window.confirm(`Avsluta "${title}"? Eleverna kan inte fortsätta. Alla påbörjade svar lämnas in som de är, även om eleven inte har lämnat in.`))) return
    setBusy(true)
    try {
      const result = await request('/api/teacher-diagnostic-assignments', { method: 'PATCH',
        body: JSON.stringify({ classId, assignmentId: assignment.assignmentId, status: 'stopped' }) })
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte avsluta screeningen.')
      setAssignments(previous => previous.map(item => item.assignmentId === assignment.assignmentId ? result.data.assignment : item))
      setStatus(result.data.failed
        ? `${title} är avslutad, men ${result.data.failed} svar kunde inte lämnas in. Klicka på Lämna in pågående igen.`
        : `${title} är avslutad. ${result.data.frozen} påbörjade svar lämnades in.`)
    } catch (error) {
      setStatus(error.message || 'Kunde inte avsluta screeningen.')
    } finally { setBusy(false) }
  }

  async function openEvidence(attempt) {
    const selection = selectionRef.current
    setDetail(null)
    setAttemptStatus('Hämtar underlaget...')
    const search = new URLSearchParams({ classId, studentId,
      assignmentId: attempt.assignmentId, attemptId: attempt.attemptId })
    try {
      const result = await request(`/api/teacher-diagnostic-attempts?${search}`)
      if (selectionRef.current !== selection) return
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte öppna underlaget.')
      setDetail(result.data)
      setAttemptStatus('')
    } catch (error) {
      if (selectionRef.current === selection) setAttemptStatus(error.message || 'Kunde inte öppna underlaget.')
    }
  }

  return <section className="mt-4 rounded-lg border border-slate-300 bg-white p-3 shadow-sm">
    <h2 className="text-lg font-semibold text-slate-800">Screening till elev eller klass</h2>
    <p className="mt-1 text-sm text-slate-800">Välj mottagare i rutan Mottagare överst och välj uppgifter. Klass och elev nedan styr vilka tilldelningar och svar som visas. Det sparas separat från vanlig träning.</p>
    <div className="mt-2 flex gap-1" aria-label="Screeningvyer">
      <button type="button" aria-pressed={view === 'dispatch'} onClick={() => { if (!reviewDirty.current || window.confirm('Genomgången har osparade ändringar. Vill du lämna dem?')) { reviewDirty.current = false; setView('dispatch') } }} className="rounded border border-slate-300 px-1.5 py-0.5 text-sm aria-pressed:bg-indigo-100">Dela ut</button>
      <button type="button" aria-pressed={view === 'group'} onClick={() => setView('group')} className="rounded border border-slate-300 px-1.5 py-0.5 text-sm aria-pressed:bg-indigo-100">Grupp</button>
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Klass
        <select value={classId} onChange={event => {
          if (reviewDirty.current && !window.confirm('Genomgången har osparade ändringar. Vill du byta klass och lämna dem?')) return
          reviewDirty.current = false
          setClassId(event.target.value)
        }} className="mt-1 block w-full rounded border border-slate-300 bg-white px-1.5 py-0.5">
          <option value="">Välj klass</option>
          {classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label hidden={view !== 'dispatch'} className="text-sm font-medium">Elev
        <select value={studentId} onChange={event => setStudentId(event.target.value)} className="mt-1 block w-full rounded border border-slate-300 bg-white px-1.5 py-0.5">
          <option value="">Välj elev</option>
          {pupils.map(pupil => <option key={pupil.studentId} value={pupil.studentId}>{pupil.name || pupil.displayAlias || pupil.studentId}</option>)}
        </select>
      </label>
    </div>
    <div hidden={view !== 'dispatch'}>
    <label className="mt-2 block text-sm font-semibold">Samlingens namn
      <input value={titleSv} maxLength={100} onChange={event => setTitleSv(event.target.value)}
        className="ml-2 rounded border border-slate-400 px-2 py-1" placeholder="Exempel: Läxa vecka 42" />
    </label>
    <label className="mt-3 block text-sm font-medium">Diagnospaket
      <select value={selectedPack?.id || ''} disabled={busy} onChange={event => {
        const pack = diagnosticCatalog.packs.find(item => item.id === event.target.value)
        if (pack) setSelectedTasks([...pack.taskIds])
      }} className="mt-1 block w-full rounded border border-slate-300 bg-white px-1.5 py-0.5">
        <option value="" disabled>Eget urval</option>
        {diagnosticCatalog.packs.map(pack => <option key={pack.id} value={pack.id}>{pack.labelSv}</option>)}
      </select>
    </label>
    <p className="mt-1 text-sm">{usesNcm
      ? 'Uppgifter ur NCM:s Diamant-diagnoser med NCM:s facit och analys. Svaren rättas automatiskt mot facit.'
      : 'Egna uppgifter för diagnostisk provning. Det här är inte ett originalprov från NCM.'} Valda uppgifter: {selectedTasks.length}.</p>
    <fieldset className="mt-3" disabled={busy}>
      <legend className="text-sm font-medium">Uppgifter</legend>
      <div className="mt-1 flex flex-wrap gap-3">{writtenTasks.map(taskCheckbox)}</div>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-semibold">NCM Diamant-uppgifter ({diagnosticCatalog.tasks.length - writtenTasks.length})</summary>
        {ncmPacks.map(pack => <div key={pack.id} className="mt-2">
          <p className="text-sm font-medium">{pack.labelSv.replace(/^NCM · /u, '')}</p>
          <div className="mt-1 flex flex-col gap-1">{pack.taskIds.map(id => taskCheckbox(findTask(id)))}</div>
        </div>)}
      </details>
    </fieldset>
    <fieldset className="mt-2 space-y-1" disabled={busy}>
      <legend className="text-sm font-semibold">Svarstyp och arbetsytor per fråga</legend>
      {selectedTasks.map(id => {
        const options = itemOptions[id] || {}
        const change = patch => setItemOptions(previous => ({ ...previous, [id]: { ...previous[id], ...patch } }))
        const task = findTask(id)
        return <div key={id} className="flex flex-wrap items-center gap-x-2 text-sm">
          <strong>{task?.promptSv}</strong>
          {/* NCM answers are marked against the facit, so their answer type is fixed. */}
          {task?.ncmCode ? <span className="text-slate-600">Facit: {task.facitSv}</span>
            : <label>Svarstyp <select value={options.answerType || 'number'} onChange={event => change({ answerType: event.target.value })} className="rounded border px-1 py-0.5">
              <option value="number">Siffersvar</option><option value="text">Skrivsvar</option>
            </select></label>}
          <label><input type="checkbox" checked={options.gridEnabled !== false} onChange={event => change({ gridEnabled: event.target.checked })} /> Räknehäfte</label>
          <label><input type="checkbox" checked={Boolean(options.drawingEnabled)} onChange={event => change({ drawingEnabled: event.target.checked })} /> Rityta</label>
        </div>
      })}
    </fieldset>
    <details className="mt-2 text-sm">
      <summary className="font-semibold">Lägg till egen skrivfråga</summary>
      <label className="block">Frågetext<textarea value={customPrompt} maxLength={2000} onChange={event => setCustomPrompt(event.target.value)} className="mt-1 block w-full rounded border p-1" /></label>
      <label className="mr-2"><input type="checkbox" checked={customGrid} onChange={event => setCustomGrid(event.target.checked)} /> Räknehäfte till skrivfrågan</label>
      <label><input type="checkbox" checked={customDrawing} onChange={event => setCustomDrawing(event.target.checked)} /> Rityta till skrivfrågan</label>
    </details>
    <details className="mt-3 rounded border border-slate-300 bg-white p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Lärarstöd för valda uppgifter</summary>
      <p className="mt-2">Granska uppställningen och fråga eleven. Rätt slutsvar bevisar inte en viss metod. Appens automatiska metodanalys är begränsad.</p>
      <ol className="mt-2 list-decimal space-y-2 pl-5">
        {selectedTasks.map(findTask).filter(Boolean).map(task => <li key={task.taskId}>
          <strong>{task.promptSv}</strong> {guideFor(task)?.goalSv}. {guideFor(task)?.questionSv}
        </li>)}
      </ol>
    </details>
    <div data-screening-recipients className="mt-3 rounded border border-indigo-200 bg-indigo-50 p-2 text-sm">
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
        className="mt-2 rounded bg-indigo-600 px-1.5 py-0.5 font-semibold text-white disabled:opacity-50">
        {busy ? 'Skapar...' : `Ge till valda mottagare (${limitCheck.ready.length} screening${limitCheck.ready.length === 1 ? '' : 'ar'})`}
      </button>}
    </div>
    <p className="mt-2 text-sm" role="status">{status}</p>
    {assignments.length > 0 && <div className="mt-3 text-sm">
      <h3 className="font-semibold">Tilldelningar i klassen</h3>
      <ul className="mt-1 list-inside list-disc">
        {assignments.map(assignment => <li key={assignment.assignmentId}>
          {assignment.titleSv || 'Screening'} · {assignment.items.length} uppgift{assignment.items.length === 1 ? '' : 'er'} · {assignment.status === 'active' ? 'aktiv' : 'avslutad'} · {assignment.assignmentId}
          <button type="button" onClick={() => stopAssignment(assignment)} disabled={busy}
            className="ml-2 rounded border border-slate-400 bg-white px-1.5 py-0.5 text-xs text-slate-800 disabled:opacity-50">
            {assignment.status === 'active' ? 'Avsluta' : 'Lämna in pågående'}</button>
        </li>)}
      </ul>
    </div>}
    </div>
    <div hidden={view !== 'group'}>
      {classId && assignments.length > 0 && <DiagnosticClassReviewPanel key={classId} classId={classId} assignments={assignments} pupils={pupils} onDirtyChange={value => { reviewDirty.current = value }} />}
    </div>
    {view === 'dispatch' && studentId && <div className="mt-5 border-t border-slate-300 pt-4">
      <h3 className="font-semibold">Sparade försök för eleven</h3>
      <button type="button" onClick={() => setRefreshVersion(value => value + 1)}
        className="mt-2 rounded border border-orange-700 bg-white px-1.5 py-0.5 text-sm text-slate-800">Uppdatera försök</button>
      {attemptStatus && <p role="status" className="mt-1 text-sm">{attemptStatus}</p>}
      {attempts.length > 0 && <ul className="mt-2 space-y-2">
        {attempts.map(attempt => <li key={attempt.attemptId} className="flex flex-wrap items-center gap-2 text-sm">
          <span>{attempt.taskId} · {attempt.createdAt ? new Date(attempt.createdAt).toLocaleString('sv-SE') : 'äldre försök'} · {attempt.status === 'submitted' ? 'fryst' : 'pågående'} · {attempt.lastSequence} händelser</span>
          <button type="button" onClick={() => openEvidence(attempt)} className="rounded border border-orange-700 bg-white px-1.5 py-0.5 text-slate-800">Visa underlag</button>
        </li>)}
      </ul>}
      {detail && <DiagnosticEvidenceDetails detail={detail} />}
    </div>}
  </section>
}
