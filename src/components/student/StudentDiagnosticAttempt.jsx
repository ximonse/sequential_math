import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DiagnosticGridPrototype from '../../dev/DiagnosticGridPrototype'
import { getPilotStudentRuntime } from '../../lib/pilotStudentRuntime'
import { appendStudentDiagnosticAttempt, fetchStudentDiagnosticAssignments,
  openStudentDiagnosticAttempt } from '../../lib/studentSessionClient'
import { savePendingDiagnosticEvents } from '../../lib/diagnosticStudentSave'
import { recoverDiagnosticDraft } from '../../lib/diagnosticDraftRecovery'

export default function StudentDiagnosticAttempt() {
  const { studentId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const assignmentId = params.get('assignment') || ''
  const itemId = params.get('item') || ''
  const [opened, setOpened] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [savedSequence, setSavedSequence] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [localSequence, setLocalSequence] = useState(0)
  const [localError, setLocalError] = useState('')
  const [conflict, setConflict] = useState(false)
  const revisionRef = useRef(0)
  const savingRef = useRef(false)
  const latestGridRef = useRef(null)
  const unsaved = eventCount > savedSequence

  useEffect(() => {
    let active = true
    ;(async () => {
      const session = await getPilotStudentRuntime().bootstrap(studentId)
      if (!active) return
      if (!session.ok || session.profile.studentId !== studentId) { navigate('/', { replace: true }); return }
      const listed = await fetchStudentDiagnosticAssignments()
      if (!active) return
      if (!listed.ok) throw new Error(listed.error || 'Kunde inte hämta testuppgiften.')
      const assignment = listed.assignments.find(item => item.assignmentId === assignmentId)
      const task = assignment?.items.find(item => item.assignmentItemId === itemId)
      if (!task) throw new Error('Testuppgiften finns inte för det här kontot.')
      const result = await openStudentDiagnosticAttempt(assignmentId, itemId)
      if (!active) return
      if (!result.ok) throw new Error(result.error || 'Kunde inte öppna räknehäftet.')
      if (result.record?.studentId !== studentId || result.record?.taskId !== task.taskId
        || result.record?.taskVersion !== task.taskVersion || !Array.isArray(result.snapshot?.events)) {
        throw new Error('Serverns räknehäfte stämmer inte med uppgiften.')
      }
      const local = await getPilotStudentRuntime().readDiagnosticDraft(studentId, result.record.attemptId)
      if (!active) return
      const recovered = recoverDiagnosticDraft(result.snapshot, local)
      revisionRef.current = result.record.serverRevision
      setSavedSequence(result.record.lastSequence)
      setEventCount(recovered.snapshot.events.length)
      setLocalSequence(local ? local.events.length : 0)
      setConflict(recovered.conflict)
      setOpened({ attemptId: result.record.attemptId, task, instructionSv: assignment.instructionSv,
        snapshot: recovered.snapshot })
      if (local && !recovered.conflict && local.events.length <= result.snapshot.events.length) {
        void getPilotStudentRuntime().clearConfirmedDiagnosticDraft(studentId, result.record.attemptId, result.snapshot)
          .catch(() => setSaveMessage('Servern har sparat arbetet, men den äldre lokala kopian kunde inte rensas.'))
      }
    })().catch(error => { if (active) setLoadError(error.message || 'Kunde inte öppna räknehäftet.') })
    return () => { active = false }
  }, [studentId, assignmentId, itemId, navigate])

  useEffect(() => {
    if (!unsaved) return undefined
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsaved])

  const onGridChange = useCallback((count, grid) => {
    latestGridRef.current = grid
    setEventCount(count)
    setSaveError('')
    if (!opened || grid.attemptId !== opened.attemptId || count <= savedSequence) return
    void getPilotStudentRuntime().saveDiagnosticDraft(studentId, opened.attemptId, grid)
      .then(() => { setLocalSequence(count); setLocalError('') })
      .catch(error => setLocalError(`${error.message || 'Kunde inte spara lokalt.'} Lämna inte sidan.`))
  }, [opened, studentId, savedSequence])

  const save = useCallback(async (grid) => {
    if (!opened || conflict || savingRef.current) return
    if (grid.events.length <= savedSequence) return
    savingRef.current = true
    setBusy(true)
    setSaveError('')
    setSaveMessage('')
    try {
      await savePendingDiagnosticEvents({ attemptId: opened.attemptId, events: grid.events,
        savedSequence, revision: revisionRef.current, append: appendStudentDiagnosticAttempt,
        onAck: ({ sequence, revision }) => { revisionRef.current = revision; setSavedSequence(sequence) } })
      try {
        await getPilotStudentRuntime().clearConfirmedDiagnosticDraft(studentId, opened.attemptId, grid)
        setSaveMessage('Alla skickade ändringar är sparade på servern.')
      } catch {
        setSaveMessage('Servern har sparat arbetet, men den lokala kopian kunde inte rensas.')
      }
    } catch (error) {
      setSaveError(`${error.message || 'Kunde inte spara.'} Arbetet finns kvar i den här fliken. Lämna inte sidan.`)
    } finally {
      savingRef.current = false
      setBusy(false)
    }
  }, [opened, savedSequence, conflict, studentId])

  useEffect(() => {
    if (!opened || !unsaved || busy || saveError || conflict) return undefined
    const timer = window.setTimeout(() => {
      if (latestGridRef.current?.events.length > savedSequence) void save(latestGridRef.current)
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [opened, unsaved, eventCount, savedSequence, busy, saveError, conflict, save])

  const goBack = () => {
    if (unsaved && !window.confirm('Du har osparade ändringar. Lämna ändå?')) return
    navigate(`/student/${studentId}`)
  }

  return <div className="student-role-surface min-h-screen">
    <div className="mx-auto max-w-5xl px-4 pt-4">
      <button type="button" onClick={goBack} className="rounded border border-slate-500 px-3 py-2">← Till min översikt</button>
    </div>
    {loadError && <p role="alert" className="mx-auto max-w-5xl px-4 py-5 text-red-800">{loadError}</p>}
    {!loadError && !opened && <p className="mx-auto max-w-5xl px-4 py-5">Öppnar räknehäftet...</p>}
    {opened && <DiagnosticGridPrototype key={opened.attemptId} pilot={{ task: opened.task,
      snapshot: opened.snapshot, instructionSv: opened.instructionSv }} onSave={save}
      onGridChange={onGridChange} saveState={{ savedSequence, localSequence, busy, conflict,
        error: conflict ? 'Arbetet skiljer sig från serverns version. Den lokala arbetskopian finns kvar på enheten. Be läraren om hjälp.'
          : saveError || (unsaved ? localError : ''), message: saveMessage }} />}
  </div>
}
