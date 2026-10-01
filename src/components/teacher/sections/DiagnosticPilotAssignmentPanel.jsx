import { useEffect, useRef, useState } from 'react'
import taskManifest from '../../../domains/arithmetic/diagnosticTasks.v1.json'
import { getTeacherApiToken } from '../../../lib/teacherAuth'
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
  const [status, setStatus] = useState('Välj en klass för att se testkonton.')
  const [busy, setBusy] = useState(false)
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
    setAssignments([])
    setStatus('Hämtar testkonton...')
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
          ? 'Välj ett särskilt testkonto. Inga vanliga elevkonton kan tilldelas här.'
          : 'Inga testkonton är tillåtna på servern ännu.')
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
      setAttemptStatus(found.length ? '' : 'Testkontot har ännu inget sparat försök.')
    }).catch(error => { if (active) setAttemptStatus(error.message || 'Kunde inte hämta försök.') })
    return () => { active = false }
  }, [classId, studentId, assignments, refreshVersion])

  const pupils = students.filter(student => testStudentIds.includes(student.studentId)
    && [student.classId, ...(student.classIds || [])].includes(classId))

  async function createAssignment() {
    if (!classId || !studentId || !selectedTasks.length || busy) return
    setBusy(true)
    try {
      const result = await request('/api/teacher-diagnostic-assignments', { method: 'POST',
        body: JSON.stringify({ classId, studentIds: [studentId], taskIds: selectedTasks }) })
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte skapa testuppdraget.')
      setAssignments(previous => [result.data.assignment, ...previous])
      setStatus('Testuppdraget är tilldelat. Logga in med testkontot för att se det.')
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

  return <section className="mt-4 rounded-lg border border-orange-300 bg-orange-100 p-4 shadow-sm">
    <h2 className="text-lg font-semibold text-orange-950">Testuppdrag för elevkonto</h2>
    <p className="mt-1 text-sm text-orange-950">Endast konton som särskilt tillåts på servern visas här. Vanliga elever ingår inte i detta test.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Klass
        <select value={classId} onChange={event => setClassId(event.target.value)} className="mt-1 block w-full rounded border border-orange-400 bg-white p-2">
          <option value="">Välj klass</option>
          {classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Testkonto
        <select value={studentId} onChange={event => setStudentId(event.target.value)} className="mt-1 block w-full rounded border border-orange-400 bg-white p-2">
          <option value="">Välj testkonto</option>
          {pupils.map(pupil => <option key={pupil.studentId} value={pupil.studentId}>{pupil.name || pupil.displayAlias || pupil.studentId}</option>)}
        </select>
      </label>
    </div>
    <fieldset className="mt-3">
      <legend className="text-sm font-medium">Uppgifter</legend>
      <div className="mt-1 flex flex-wrap gap-3">
        {taskManifest.tasks.map(task => <label key={task.taskId} className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={selectedTasks.includes(task.taskId)} onChange={event => setSelectedTasks(previous => event.target.checked
            ? [...previous, task.taskId] : previous.filter(id => id !== task.taskId))} />
          {task.promptSv}
        </label>)}
      </div>
    </fieldset>
    <button type="button" onClick={createAssignment} disabled={!pupils.some(pupil => pupil.studentId === studentId) || !selectedTasks.length || busy}
      className="mt-3 rounded bg-orange-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
      {busy ? 'Skapar...' : 'Ge testuppdrag'}
    </button>
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
      <h3 className="font-semibold">Sparade försök för testkontot</h3>
      <button type="button" onClick={() => setRefreshVersion(value => value + 1)}
        className="mt-2 rounded border border-orange-700 bg-white px-3 py-1 text-sm text-orange-950">Uppdatera försök</button>
      {attemptStatus && <p role="status" className="mt-1 text-sm">{attemptStatus}</p>}
      {attempts.length > 0 && <ul className="mt-2 space-y-2">
        {attempts.map(attempt => <li key={attempt.attemptId} className="flex flex-wrap items-center gap-2 text-sm">
          <span>{attempt.taskId} · {attempt.status === 'submitted' ? 'fryst' : 'pågående'} · {attempt.lastSequence} händelser</span>
          <button type="button" onClick={() => openEvidence(attempt)} className="rounded border border-orange-700 bg-white px-3 py-1 text-orange-950">Visa underlag</button>
        </li>)}
      </ul>}
      {detail && <section className="mt-4 rounded border border-orange-300 bg-white p-3" aria-label="Diagnostiskt elevunderlag">
        <h4 className="font-semibold">{detail.task.promptSv}</h4>
        <p className="mt-1 text-sm">Slutsvar: {detail.observation.explicitAnswer || 'inte skrivet'} · {answerLabels[detail.observation.answerStatus] || 'okänt'}</p>
        <p className="text-sm">Kolumnplacering: {detail.columnAlignment.status === 'observed'
          ? detail.columnAlignment.alignment === 'aligned' ? 'entalen i samma kolumn' : 'entalen i olika kolumner'
          : 'kan inte avgöras säkert'}. Detta beskriver placeringen, inte varför eleven räknade så.</p>
        <div className="mt-3 overflow-x-auto">
          <div className="diagnostic-grid" role="grid" aria-label="Elevens sparade uppställning">
            {Array.from({ length: detail.snapshot.rows * detail.snapshot.columns }, (_, index) => {
              const row = Math.floor(index / detail.snapshot.columns)
              const column = index % detail.snapshot.columns
              const cell = detail.snapshot.cells[`${row}:${column}`] || {}
              return <div key={`${row}:${column}`} className={`diagnostic-cell ${cell.note ? 'diagnostic-cell--note' : ''}`}
                role="gridcell" aria-label={`rad ${row + 1}, kolumn ${column + 1}, ${cell.main || cell.note || 'tom'}`}>
                {cell.main && <span className={`diagnostic-cell__digit diagnostic-cell__digit--main ${cell.struck ? 'diagnostic-cell__digit--struck' : ''}`}>{cell.main}</span>}
                {cell.note && <span className={`diagnostic-cell__digit diagnostic-cell__digit--note ${cell.struck ? 'diagnostic-cell__digit--struck' : ''}`}>{cell.note}</span>}
              </div>
            })}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-700">Uppgift {detail.record.taskId}, version {detail.record.taskVersion}. Analysversion {detail.columnAlignment.analysisVersion}. Händelser: {detail.snapshot.events.length}.</p>
      </section>}
    </div>}
  </section>
}
