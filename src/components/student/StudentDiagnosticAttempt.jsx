import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DiagnosticGridPrototype from '../../dev/DiagnosticGridPrototype'
import { getPilotStudentRuntime } from '../../lib/pilotStudentRuntime'
import { appendStudentDiagnosticAttempt, fetchStudentDiagnosticAssignments,
  openStudentDiagnosticAttempt } from '../../lib/studentSessionClient'
import { savePendingDiagnosticEvents } from '../../lib/diagnosticStudentSave'

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
  const revisionRef = useRef(0)
  const savingRef = useRef(false)
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
      revisionRef.current = result.record.serverRevision
      setSavedSequence(result.record.lastSequence)
      setEventCount(result.record.lastSequence)
      setOpened({ attemptId: result.record.attemptId, task, instructionSv: assignment.instructionSv,
        snapshot: result.snapshot })
    })().catch(error => { if (active) setLoadError(error.message || 'Kunde inte öppna räknehäftet.') })
    return () => { active = false }
  }, [studentId, assignmentId, itemId, navigate])

  useEffect(() => {
    if (!unsaved) return undefined
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsaved])

  const onGridChange = useCallback(count => setEventCount(count), [])

  async function save(grid) {
    if (!opened || savingRef.current) return
    if (grid.events.length <= savedSequence) return
    savingRef.current = true
    setBusy(true)
    setSaveError('')
    setSaveMessage('')
    try {
      await savePendingDiagnosticEvents({ attemptId: opened.attemptId, events: grid.events,
        savedSequence, revision: revisionRef.current, append: appendStudentDiagnosticAttempt,
        onAck: ({ sequence, revision }) => { revisionRef.current = revision; setSavedSequence(sequence) } })
      setSaveMessage('Alla skickade ändringar är sparade på servern.')
    } catch (error) {
      setSaveError(`${error.message || 'Kunde inte spara.'} Arbetet finns kvar i den här fliken. Lämna inte sidan.`)
    } finally {
      savingRef.current = false
      setBusy(false)
    }
  }

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
      onGridChange={onGridChange} saveState={{ savedSequence, busy, error: saveError, message: saveMessage }} />}
  </div>
}
