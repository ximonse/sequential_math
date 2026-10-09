import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DiagnosticGridPrototype from '../../dev/DiagnosticGridPrototype'
import { getPilotStudentRuntime } from '../../lib/pilotStudentRuntime'
import { appendStudentDiagnosticAttempt, fetchStudentDiagnosticAssignments,
  openStudentDiagnosticAttempt, submitStudentDiagnosticCollection } from '../../lib/studentSessionClient'
import { savePendingDiagnosticEvents } from '../../lib/diagnosticStudentSave'
import { recoverDiagnosticDraft } from '../../lib/diagnosticDraftRecovery'

export default function StudentDiagnosticAttempt() {
  const { studentId } = useParams()
  const [params] = useSearchParams()
  return <AssignedDiagnosticAttempt key={`${studentId}:${params.get('assignment')}:${params.get('item')}`} />
}

function AssignedDiagnosticAttempt() {
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
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [localSequence, setLocalSequence] = useState(0)
  const [localError, setLocalError] = useState('')
  const [conflict, setConflict] = useState(false)
  const revisionRef = useRef(0)
  const savedSequenceRef = useRef(0)
  const savePromiseRef = useRef(null)
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
      savedSequenceRef.current = result.record.lastSequence
      setSavedSequence(result.record.lastSequence)
      setEventCount(recovered.snapshot.events.length)
      setLocalSequence(local ? local.events.length : 0)
      setConflict(recovered.conflict)
      setOpened({ attemptId: result.record.attemptId, task, assignment, instructionSv: assignment.instructionSv,
        snapshot: recovered.snapshot,
        previousItem: assignment.items[assignment.items.findIndex(item => item.assignmentItemId === itemId) - 1],
        nextItem: assignment.items[assignment.items.findIndex(item => item.assignmentItemId === itemId) + 1] })
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
    if (!opened || conflict) return false
    while (savePromiseRef.current) await savePromiseRef.current
    if (grid.events.length <= savedSequenceRef.current) return true
    setBusy(true)
    setSaveError('')
    setSaveMessage('')
    const operation = (async () => { try {
      await savePendingDiagnosticEvents({ attemptId: opened.attemptId, events: grid.events,
        savedSequence: savedSequenceRef.current, revision: revisionRef.current, append: appendStudentDiagnosticAttempt,
        onAck: ({ sequence, revision }) => { revisionRef.current = revision; savedSequenceRef.current = sequence; setSavedSequence(sequence) } })
      try {
        await getPilotStudentRuntime().clearConfirmedDiagnosticDraft(studentId, opened.attemptId, grid)
        setSaveMessage('Alla skickade ändringar är sparade på servern.')
      } catch {
        setSaveMessage('Servern har sparat arbetet, men den lokala kopian kunde inte rensas.')
      }
      return true
    } catch (error) {
      setSaveError(`${error.message || 'Kunde inte spara.'} Arbetet finns kvar i den här fliken. Lämna inte sidan.`)
      return false
    } finally {
      setBusy(false)
    }
    })()
    savePromiseRef.current = operation
    const result = await operation
    if (savePromiseRef.current === operation) savePromiseRef.current = null
    return result
  }, [opened, conflict, studentId])

  async function saveLatestBeforeLeaving() {
    // Editing remains available during an append. Flush any edits made while
    // awaiting that append too; navigating must never outrun the server ack.
    do {
      if (!await save(latestGridRef.current || opened.snapshot)) return false
    } while ((latestGridRef.current || opened.snapshot).events.length > savedSequenceRef.current)
    return true
  }

  async function changeQuestion(item) {
    if (!item || conflict) return
    if (!await saveLatestBeforeLeaving()) return
    navigate(`/student/${studentId}/diagnostic?assignment=${encodeURIComponent(assignmentId)}&item=${encodeURIComponent(item.assignmentItemId)}`)
  }

  async function submitCollection(grid) {
    if (conflict || busy) return
    setSubmitting(true)
    if (!await save(grid)) { setSubmitting(false); return }
    setBusy(true)
    setSaveError('')
    try {
      const entries = []
      for (const item of opened.assignment.items) {
        const result = await openStudentDiagnosticAttempt(assignmentId, item.assignmentItemId)
        if (!result.ok) throw new Error(result.error || 'Kunde inte hämta samlingens frågor.')
        const local = await getPilotStudentRuntime().readDiagnosticDraft(studentId, result.record.attemptId)
        const recovered = recoverDiagnosticDraft(result.snapshot, local)
        if (recovered.conflict) throw new Error('En arbetskopia skiljer sig från servern. Inget lämnades in.')
        const saved = await savePendingDiagnosticEvents({ attemptId: result.record.attemptId, events: recovered.snapshot.events,
          savedSequence: result.record.lastSequence, revision: result.record.serverRevision, append: appendStudentDiagnosticAttempt })
        entries.push({ attemptId: result.record.attemptId, revision: saved.revision, sequence: saved.sequence, snapshot: recovered.snapshot })
      }
      const missing = entries.flatMap((entry, index) => !entry.snapshot.answer.trim() ? [index + 1] : [])
      if (missing.length && !window.confirm(`Fråga ${missing.join(', ')} saknar svar. Vill du ändå lämna in hela samlingen?`)) return
      const result = await submitStudentDiagnosticCollection(assignmentId, entries.map(({ attemptId, revision, sequence }) => ({ attemptId, revision, sequence })))
      if (!result.ok || !result.submitted || result.attempts?.length !== entries.length) throw new Error(result.error || 'Servern bekräftade inte hela inlämningen.')
      for (const entry of entries) {
        const frozen = result.attempts.find(item => item.attemptId === entry.attemptId)
        const suffix = entry.snapshot.status === 'submitted' ? 0 : 1
        if (!frozen || frozen.snapshot.status !== 'submitted' || frozen.snapshot.events.length !== entry.sequence + suffix
          || entry.snapshot.events.some((event, index) => JSON.stringify(event) !== JSON.stringify(frozen.snapshot.events[index]))) {
          throw new Error('Serverns inlämningskvittens stämmer inte med arbetet. Ladda om för att kontrollera status.')
        }
        // A local cleanup failure cannot undo a server-confirmed submission.
        await getPilotStudentRuntime().clearConfirmedDiagnosticDraft(studentId, entry.attemptId, frozen.snapshot).catch(() => {})
      }
      const current = result.attempts.find(item => item.attemptId === opened.attemptId)
      savedSequenceRef.current = current.snapshot.events.length
      revisionRef.current = current.serverRevision
      setSavedSequence(current.snapshot.events.length)
      setEventCount(current.snapshot.events.length)
      setOpened(previous => ({ ...previous, snapshot: current.snapshot, frozen: true,
        assignment: { ...previous.assignment, submissionStatus: 'submitted' } }))
      setSaveMessage('Samlingen är inlämnad.')
    } catch (error) { setSaveError(error.message || 'Kunde inte lämna in samlingen. Dina svar finns kvar.') }
    finally { setBusy(false); setSubmitting(false) }
  }

  useEffect(() => {
    if (!opened || !unsaved || busy || saveError || conflict) return undefined
    const timer = window.setTimeout(() => {
      if (latestGridRef.current?.events.length > savedSequence) void save(latestGridRef.current)
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [opened, unsaved, eventCount, savedSequence, busy, saveError, conflict, save])

  const goBack = async () => {
    if (opened && !await saveLatestBeforeLeaving()) return
    navigate(`/student/${studentId}`)
  }

  return <div className="student-role-surface min-h-screen">
    {!opened && <div className="mx-auto max-w-5xl px-4 pt-4 text-right">
      <a href="#" onClick={event => { event.preventDefault(); goBack() }}>Startsida</a>
    </div>}
    {loadError && <p role="alert" className="mx-auto max-w-5xl px-4 py-5 text-red-800">{loadError}</p>}
    {!loadError && !opened && <p className="mx-auto max-w-5xl px-4 py-5">Öppnar räknehäftet...</p>}
    {opened?.task.feedback && <section aria-label="Återkoppling från läraren" className="mx-auto mt-2 max-w-5xl rounded border border-emerald-500 bg-emerald-50 px-2 py-1">
      <h2 className="font-semibold">Återkoppling från läraren</h2>
      <p className="whitespace-pre-wrap">{opened.task.feedback.text}</p>
    </section>}
    {opened && <DiagnosticGridPrototype key={`${opened.attemptId}:${opened.frozen || ''}`} pilot={{ task: opened.task,
      snapshot: opened.snapshot, instructionSv: opened.instructionSv }} onSave={save} onHome={goBack}
      collectionTitle={opened.assignment.titleSv} questionIndex={opened.assignment.items.findIndex(item => item.assignmentItemId === itemId) + 1}
      questionCount={opened.assignment.items.length} onSubmitCollection={submitCollection}
      onPrevious={opened.previousItem ? () => changeQuestion(opened.previousItem) : null}
      onNext={opened.nextItem ? () => changeQuestion(opened.nextItem) : null}
      onGridChange={onGridChange} saveState={{ savedSequence, localSequence, busy, conflict, submitting,
        collectionSubmitted: opened.assignment.submissionStatus === 'submitted',
        error: conflict ? 'Arbetet skiljer sig från serverns version. Den lokala arbetskopian finns kvar på enheten. Be läraren om hjälp.'
          : saveError || (unsaved ? localError : ''), message: saveMessage }} />}
  </div>
}
