import { useEffect, useMemo, useRef, useState } from 'react'
import { diagnosticRequest as request } from './diagnosticRequest'
import DiagnosticCollectionReview from './DiagnosticCollectionReview'
import ScreeningPupilAttempts from './ScreeningPupilAttempts'
import { buildScreeningDispatches } from './screeningRecipients'
import { groupCollections, resultFilter } from './screeningCollections'

const collectionLabel = (collection, classNames) => {
  const where = collection.members.map(member => classNames.get(member.classId) || member.classId).join(', ')
  return `${collection.titleSv} · ${new Date(collection.createdAt).toLocaleString('sv-SE')} · ${collection.members[0].items.length} uppgift${collection.members[0].items.length === 1 ? '' : 'er'} · ${where}`
}

// Results of screenings for the picked recipients: classes, groups or pupils.
// A group that spans classes is read as one table.
export default function ScreeningResultsPanel({ classes, students, recipients = [], teacherGroups = [], onDirtyChange, active: isActive = true, requestedCollectionId = '' }) {
  const plan = useMemo(() => buildScreeningDispatches(recipients, { classes, groups: teacherGroups, students }),
    [recipients, classes, teacherGroups, students])
  const classKey = plan.dispatches.map(item => item.classId).join(',')
  const [loaded, setLoaded] = useState({})
  const [collectionId, setCollectionId] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const dirty = useRef(false)
  const markDirty = value => { dirty.current = value; onDirtyChange?.(value) }
  const classNames = useMemo(() => new Map(classes.map(item => [String(item.id), item.name])), [classes])
  const isAllowed = useMemo(() => resultFilter(plan.dispatches), [plan])

  useEffect(() => {
    if (!isActive) return undefined
    if (!classKey) { setLoaded({}); return undefined }
    let active = true
    setLoaded({})
    for (const classId of classKey.split(',')) {
      void request(`/api/teacher-diagnostic-assignments?classId=${encodeURIComponent(classId)}`).then(result => {
        if (!active) return
        const state = result.status === 404 ? { state: 'unavailable', assignments: [] }
          : result.ok ? { state: 'ready', assignments: (result.data.assignments || []).map(item => ({ ...item, classId })) }
            : { state: 'error', assignments: [], error: result.data.error }
        setLoaded(previous => ({ ...previous, [classId]: state }))
      }).catch(() => { if (active) setLoaded(previous => ({ ...previous, [classId]: { state: 'error', assignments: [] } })) })
    }
    return () => { active = false }
  }, [classKey, isActive])

  const waiting = classKey.split(',').filter(Boolean).some(classId => !loaded[classId])
  const collections = useMemo(() => groupCollections(Object.values(loaded).flatMap(item => item.assignments)), [loaded])
  useEffect(() => {
    if (!requestedCollectionId) return
    const requestedIds = new Set(requestedCollectionId.split('+'))
    const match = collections.find(item => item.id === requestedCollectionId
      || item.members.some(member => requestedIds.has(member.assignmentId)))
    if (match) setCollectionId(match.id)
  }, [requestedCollectionId, collections])
  const selected = collections.find(item => item.id === collectionId) || null
  const failed = Object.entries(loaded).filter(([, item]) => item.state !== 'ready')
  const assignmentsFor = classId => loaded[classId]?.assignments || []
  const name = id => {
    const pupil = students.find(item => item.studentId === id)
    return pupil?.name || pupil?.displayAlias || id
  }
  const pupils = useMemo(() => {
    const seen = new Set()
    return students.flatMap(student => {
      const classId = plan.dispatches.map(item => item.classId).find(candidate => [student.classId, ...(student.classIds || [])].map(String).includes(candidate))
      if (!classId || seen.has(student.studentId) || !isAllowed(classId, student.studentId)) return []
      seen.add(student.studentId)
      return [{ ...student, classId }]
    })
  }, [students, plan, isAllowed])

  async function stopCollection(collection) {
    const active = collection.members.filter(member => member.status === 'active')
    if (busy || (active.length > 0 && !window.confirm(`Avsluta "${collection.titleSv}"? Eleverna kan inte fortsätta. Alla påbörjade svar lämnas in som de är, även om eleven inte har lämnat in.`))) return
    setBusy(true)
    const problems = []
    let frozen = 0
    for (const member of collection.members) {
      try {
        const result = await request('/api/teacher-diagnostic-assignments', { method: 'PATCH',
          body: JSON.stringify({ classId: member.classId, assignmentId: member.assignmentId, status: 'stopped' }) })
        if (!result.ok) throw new Error(result.data.error || 'Kunde inte avsluta screeningen.')
        frozen += result.data.frozen || 0
        if (result.data.failed) problems.push(`${classNames.get(member.classId) || member.classId}: ${result.data.failed} svar kunde inte lämnas in. Klicka på Lämna in pågående igen.`)
        setLoaded(previous => ({ ...previous, [member.classId]: { ...previous[member.classId],
          assignments: previous[member.classId].assignments.map(item => item.assignmentId === member.assignmentId ? { ...result.data.assignment, classId: member.classId } : item) } }))
      } catch (error) {
        problems.push(`${classNames.get(member.classId) || member.classId}: ${error.message || 'Kunde inte nå servern.'}`)
      }
    }
    setStatus(problems.length ? `${collection.titleSv}: ${problems.join(' ')}` : `${collection.titleSv} är avslutad. ${frozen} påbörjade svar lämnades in.`)
    setBusy(false)
  }

  const everyoneStopped = selected && selected.members.every(member => member.status !== 'active')
  return <section aria-labelledby="screening-results-title" className="mt-4 rounded-lg border border-slate-300 bg-white p-3 shadow-sm">
    <h2 id="screening-results-title" className="text-lg font-semibold text-slate-800">Resultat av screening</h2>
    <p className="mt-1 text-sm text-slate-800">Välj klass, grupp eller elev i rutan Mottagare överst. Här ser du svaren på samlingar som delats ut till dem. En grupp som går över flera klasser visas i en tabell.</p>
    {recipients.length === 0 && <p role="status" className="mt-3 text-sm">Välj mottagare överst för att se resultat.</p>}
    {plan.withoutClass.length > 0 && <p className="mt-2 text-sm">Utan klass, inga resultat: {plan.withoutClass.join(', ')}.</p>}
    {waiting && <p role="status" className="mt-3 text-sm">Hämtar samlingar...</p>}
    {failed.map(([classId, item]) => <p key={classId} role="status" className="mt-2 text-sm text-amber-900">
      {classNames.get(classId) || classId}: {item.state === 'unavailable' ? 'screening är inte aktiverat på servern' : item.error || 'kunde inte hämta samlingar'}.</p>)}
    {!waiting && classKey && collections.length === 0 && failed.length === 0 && <p role="status" className="mt-3 text-sm">Det finns inga utdelade samlingar till de valda mottagarna ännu. Använd Dela ut för att skapa eller återanvända en samling.</p>}
    {collections.length > 0 && <label className="mt-3 block text-sm font-medium">Samling att gå igenom
      <select value={selected ? collectionId : ''} onChange={event => {
        if (dirty.current && !window.confirm('Genomgången har osparade ändringar. Vill du lämna dem?')) return
        markDirty(false)
        setCollectionId(event.target.value)
      }} className="mt-1 block w-full rounded border border-slate-300 bg-white px-1.5 py-0.5">
        <option value="">Välj samling</option>
        {collections.map(collection => <option key={collection.id} value={collection.id}>{collectionLabel(collection, classNames)}</option>)}
      </select>
    </label>}
    {selected && <>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span>{selected.members.map(member => `${classNames.get(member.classId) || member.classId}: ${member.status === 'active' ? 'aktiv' : 'avslutad'}`).join(' · ')}</span>
        <button type="button" onClick={() => stopCollection(selected)} disabled={busy}
          className="rounded border border-slate-400 bg-white px-1.5 py-0.5 text-xs text-slate-800 disabled:opacity-50">
          {everyoneStopped ? 'Lämna in pågående' : 'Avsluta'}</button>
      </div>
      <DiagnosticCollectionReview key={selected.id} members={selected.members} isAllowed={isAllowed} name={name} onDirtyChange={markDirty} />
    </>}
    {status && <p className="mt-2 text-sm" role="status">{status}</p>}
    {pupils.length > 0 && <ScreeningPupilAttempts pupils={pupils} assignmentsFor={assignmentsFor} />}
  </section>
}
