import { useEffect, useRef, useState } from 'react'
import taskManifest from '../../../domains/arithmetic/diagnosticTasks.v1.json'
import taskPacks from '../../../domains/arithmetic/diagnosticTaskPacks.v1.json'
import { getTeacherApiToken } from '../../../lib/teacherAuth'
import DiagnosticAttemptHistory from './DiagnosticAttemptHistory'
import '../../../dev/diagnosticGridPrototype.css'

const taskIds = taskManifest.tasks.map(task => task.taskId)

async function request(url, options = {}) {
  const token = getTeacherApiToken()
  const response = await fetch(url, { credentials: 'include', ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'x-teacher-token': token } : {}) } })
  const data = await response.json().catch(() => ({}))
  return { status: response.status, ok: response.ok, data }
}

export default function DiagnosticPilotAssignmentPanel({ classes, students }) {
  const [classId, setClassId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [selectedTasks, setSelectedTasks] = useState([taskIds[0]])
  const [testStudentIds, setTestStudentIds] = useState([])
  const [assignments, setAssignments] = useState([])
  const [status, setStatus] = useState('Välj en klass för att se eleverna.')
  const [busy, setBusy] = useState(false)
  const [wholeClassAvailable, setWholeClassAvailable] = useState(false)
  const [classStudentCount, setClassStudentCount] = useState(0)
  const [attempts, setAttempts] = useState([])
  const [attemptStatus, setAttemptStatus] = useState('')
  const [detail, setDetail] = useState(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const selectionRef = useRef('')
  selectionRef.current = `${classId}:${studentId}`

  useEffect(() => {
    if (!classId) return undefined
    let active = true
    setStudentId('')
    setWholeClassAvailable(false)
    setClassStudentCount(0)
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
        setWholeClassAvailable(Boolean(result.data.wholeClassAvailable))
        setClassStudentCount(result.data.classStudentCount || 0)
        setAssignments(result.data.assignments || [])
        setStatus(result.data.testStudentIds?.length
          ? 'Välj en elev i klassen.'
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
  const selectedPack = taskPacks.packs.find(pack => JSON.stringify(pack.taskIds) === JSON.stringify(selectedTasks))
  const guideFor = task => taskPacks.guides[task?.intentCode]

  async function createAssignment(wholeClass = false) {
    if (!classId || (wholeClass ? !wholeClassAvailable : !studentId) || !selectedTasks.length || busy) return
    setBusy(true)
    try {
      const result = await request('/api/teacher-diagnostic-assignments', { method: 'POST',
        body: JSON.stringify({ classId, ...(wholeClass ? { audience: 'class' } : { studentIds: [studentId] }), taskIds: selectedTasks }) })
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte skapa testuppdraget.')
      setAssignments(previous => [result.data.assignment, ...previous])
      setStatus(wholeClass ? `Uppdraget är tilldelat hela klassen (${result.data.assignment.studentIds.length} elever).`
        : 'Testuppdraget är tilldelat. Logga in som eleven för att se det.')
    } catch (error) {
      setStatus(error.message || 'Kunde inte skapa testuppdraget.')
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

  const answerLabels = { unanswered: 'inget slutsvar', incomplete: 'ofullständigt slutsvar',
    correct: 'rätt slutsvar', incorrect: 'fel slutsvar' }
  const visibleResultReasons = { no_unique_aligned_setup: 'uppställningen inte är entydigt kolumnjusterad',
    no_complete_explicit_answer: 'ett fullständigt slutsvar saknas', no_result_row: 'resultatrad saknas',
    crossed_out_operand: 'en av talsiffrorna är överstruken', no_unambiguous_answer_line: 'ett entydigt svarsstreck saknas',
    no_unambiguous_result: 'ett entydigt resultat saknas under strecket',
    other_visible_work: 'det finns ytterligare arbete utanför uppställningen',
    result_outside_safe_range: 'resultatet ligger utanför säkert talintervall' }

  return <section className="mt-4 rounded-lg border border-orange-300 bg-orange-100 p-4 shadow-sm">
    <h2 className="text-lg font-semibold text-orange-950">Testuppdrag till elev eller klass</h2>
    <p className="mt-1 text-sm text-orange-950">Välj klass och uppgifter. Ge uppdraget till en vald elev eller hela klassen. Det sparas separat från vanlig träning.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Klass
        <select value={classId} onChange={event => setClassId(event.target.value)} className="mt-1 block w-full rounded border border-orange-400 bg-white p-2">
          <option value="">Välj klass</option>
          {classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Elev
        <select value={studentId} onChange={event => setStudentId(event.target.value)} className="mt-1 block w-full rounded border border-orange-400 bg-white p-2">
          <option value="">Välj elev</option>
          {pupils.map(pupil => <option key={pupil.studentId} value={pupil.studentId}>{pupil.name || pupil.displayAlias || pupil.studentId}</option>)}
        </select>
      </label>
    </div>
    <label className="mt-3 block text-sm font-medium">Diagnospaket
      <select value={selectedPack?.id || ''} disabled={busy} onChange={event => {
        const pack = taskPacks.packs.find(item => item.id === event.target.value)
        if (pack) setSelectedTasks([...pack.taskIds])
      }} className="mt-1 block w-full rounded border border-orange-400 bg-white p-2">
        <option value="" disabled>Eget urval</option>
        {taskPacks.packs.map(pack => <option key={pack.id} value={pack.id}>{pack.labelSv}</option>)}
      </select>
    </label>
    <p className="mt-1 text-sm">Egna uppgifter för diagnostisk provning. Det här är inte ett originalprov från NCM. Valda uppgifter: {selectedTasks.length}.</p>
    <fieldset className="mt-3" disabled={busy}>
      <legend className="text-sm font-medium">Uppgifter</legend>
      <div className="mt-1 flex flex-wrap gap-3">
        {taskManifest.tasks.map(task => <label key={task.taskId} className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={selectedTasks.includes(task.taskId)} onChange={event => setSelectedTasks(previous => event.target.checked
            ? [...previous, task.taskId] : previous.filter(id => id !== task.taskId))} />
          {task.promptSv}
        </label>)}
      </div>
    </fieldset>
    <details className="mt-3 rounded border border-orange-300 bg-white p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Lärarstöd för valda uppgifter</summary>
      <p className="mt-2">Granska uppställningen och fråga eleven. Rätt slutsvar bevisar inte en viss metod. Appens automatiska metodanalys är begränsad.</p>
      <ol className="mt-2 list-decimal space-y-2 pl-5">
        {selectedTasks.map(id => taskManifest.tasks.find(task => task.taskId === id)).filter(Boolean).map(task => <li key={task.taskId}>
          <strong>{task.promptSv}</strong> {guideFor(task)?.goalSv}. {guideFor(task)?.questionSv}
        </li>)}
      </ol>
    </details>
    <button type="button" onClick={() => createAssignment()} disabled={!pupils.some(pupil => pupil.studentId === studentId) || !selectedTasks.length || busy}
      className="mt-3 rounded bg-orange-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
      {busy ? 'Skapar...' : 'Ge testuppdrag'}
    </button>
    <button type="button" onClick={() => createAssignment(true)} disabled={!classId || !wholeClassAvailable || !selectedTasks.length || busy}
      className="ml-2 mt-3 rounded bg-orange-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
      Ge till hela klassen{classStudentCount ? ` (${classStudentCount} elever)` : ''}
    </button>
    {classId && classStudentCount > 0 && !wholeClassAvailable && <p className="mt-2 text-sm">Serverns testbegränsning tillåter inte hela klassen.</p>}
    <p className="mt-2 text-sm" role="status">{status}</p>
    {assignments.length > 0 && <div className="mt-3 text-sm">
      <h3 className="font-semibold">Tilldelningar i klassen</h3>
      <ul className="mt-1 list-inside list-disc">
        {assignments.map(assignment => <li key={assignment.assignmentId}>
          {assignment.items.length} uppgift{assignment.items.length === 1 ? '' : 'er'} · {assignment.status === 'active' ? 'aktiv' : 'stoppad'} · {assignment.assignmentId}
        </li>)}
      </ul>
    </div>}
    {studentId && <div className="mt-5 border-t border-orange-300 pt-4">
      <h3 className="font-semibold">Sparade försök för eleven</h3>
      <button type="button" onClick={() => setRefreshVersion(value => value + 1)}
        className="mt-2 rounded border border-orange-700 bg-white px-3 py-1 text-sm text-orange-950">Uppdatera försök</button>
      {attemptStatus && <p role="status" className="mt-1 text-sm">{attemptStatus}</p>}
      {attempts.length > 0 && <ul className="mt-2 space-y-2">
        {attempts.map(attempt => <li key={attempt.attemptId} className="flex flex-wrap items-center gap-2 text-sm">
          <span>{attempt.taskId} · {attempt.createdAt ? new Date(attempt.createdAt).toLocaleString('sv-SE') : 'äldre försök'} · {attempt.status === 'submitted' ? 'fryst' : 'pågående'} · {attempt.lastSequence} händelser</span>
          <button type="button" onClick={() => openEvidence(attempt)} className="rounded border border-orange-700 bg-white px-3 py-1 text-orange-950">Visa underlag</button>
        </li>)}
      </ul>}
      {detail && <section className="mt-4 rounded border border-orange-300 bg-white p-3" aria-label="Diagnostiskt elevunderlag">
        <h4 className="font-semibold">{detail.task.promptSv}</h4>
        {guideFor(detail.task) && <div className="mt-2 rounded bg-orange-50 p-2 text-sm">
          <p><strong>Att granska:</strong> {guideFor(detail.task).goalSv}.</p>
          <p><strong>Fråga eleven:</strong> {guideFor(detail.task).questionSv}</p>
          <p className="text-xs">Lärarstöd för uppgiftens syfte; detta är inte en automatiskt konstaterad felorsak.</p>
        </div>}
        <p className="text-xs text-slate-700">Sparad elevrevision {detail.evidenceRevision.serverRevision} · {detail.evidenceRevision.lastSequence} {detail.evidenceRevision.lastSequence === 1 ? 'händelse' : 'händelser'}. Analysen beräknas när underlaget öppnas.</p>
        <p className="mt-1 text-sm">Slutsvar: {detail.observation.explicitAnswer || 'inte skrivet'} · {answerLabels[detail.observation.answerStatus] || 'okänt'}</p>
        <p className="text-sm">Kolumnplacering: {detail.columnAlignment.status === 'observed'
          ? detail.columnAlignment.alignment === 'aligned' ? 'entalen i samma kolumn' : 'entalen i olika kolumner'
          : 'kan inte avgöras säkert'}. Detta beskriver placeringen, inte varför eleven räknade så.</p>
        <p className="text-sm">Synligt resultat och slutsvar: {detail.visibleResult.status === 'observed'
          ? `${detail.visibleResult.visibleResult} i rutorna och ${detail.visibleResult.explicitAnswer} som slutsvar ${detail.visibleResult.consistency === 'same' ? 'stämmer överens' : 'skiljer sig åt'}. Resultatet lästes på rad ${detail.visibleResult.evidence.resultCells[0].row + 1}. Detta visar ingen orsak till skillnaden.`
          : `kan inte jämföras säkert eftersom ${visibleResultReasons[detail.visibleResult.reason] || 'underlaget är otydligt'}.`}</p>
        {detail.subtractionPattern.status !== 'not_applicable' && <p className="mt-1 text-sm">
          Subtraktionsmönster: {detail.subtractionPattern.status === 'matched'
            ? 'Resultatet 376 är förenligt med att ta större siffra minus mindre i varje kolumn. Fråga eleven hur tiotalet och lånet genom noll hanterades. Mönstret bevisar inte metoden.'
            : detail.subtractionPattern.status === 'no_match'
              ? 'Det synliga resultatet följer inte mönstret större minus mindre i varje kolumn.'
              : 'För lite entydigt underlag för att bedöma detta mönster.'}
        </p>}
        <DiagnosticAttemptHistory key={`${detail.record.attemptId}:${detail.record.serverRevision}`} snapshot={detail.snapshot} />
        <p className="mt-2 text-xs text-slate-700">Uppgift {detail.record.taskId}, version {detail.record.taskVersion}. Analysversioner: kolumn {detail.columnAlignment.analysisVersion}, resultat {detail.visibleResult.analysisVersion}, subtraktion {detail.subtractionPattern.analysisVersion}. Händelser: {detail.snapshot.events.length}.</p>
      </section>}
    </div>}
  </section>
}
