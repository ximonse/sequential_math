import { useEffect, useRef, useState } from 'react'
import { didacticDefinition } from '../../domains/arithmetic/didacticPackages.js'
import { diagnosticRequest } from './sections/diagnosticRequest.js'
import { stockholmDay } from '../../lib/evidencePeriod.js'
import { readEvidenceWindow } from '../../lib/readEvidenceWindow.js'
import { getTeacherApiToken } from '../../lib/teacherAuth.js'

const drafts = new Map()

async function call(url, body) {
  const response = await diagnosticRequest(url, body ? { method: 'POST', body: JSON.stringify(body) } : {})
  if (!response.ok) throw new Error(response.data.error || 'Åtgärden kunde inte bekräftas.')
  return response.data
}
const phaseLabel = { contrast: 'Prövning före undervisning', independent_check: 'Ny kontroll efter undervisning', later_check: 'Senare kontroll' }

export default function DidacticFollowUp(props) {
  const definition = didacticDefinition(props.material.investigation.didactic.packageId)
  if (!definition || definition.pack.version !== props.material.investigation.didactic.packageVersion) return <p>Detta didaktikpaket behöver granskas i rätt version innan nya kontroller kan skapas.</p>
  return <DidacticPackageFlow key={`${definition.pack.id}:${definition.pack.version}`} {...props} pack={definition.pack} tasks={definition.tasks} />
}

function DidacticPackageFlow({ material, receipt, draftId, version, complete, pack, tasks }) {
  const intent = material.investigation, pupil = intent.pupils.find(pupil => pupil.studentId === receipt.studentId)
  const review = pupil?.reportReview
  const cacheKey = `${getTeacherApiToken()}:${draftId}:${version}:${receipt.studentId}`
  const cached = drafts.get(cacheKey)
  const [history, setHistory] = useState(null), [status, setStatus] = useState(''), [busy, setBusy] = useState(false)
  const [note, setNote] = useState(cached?.note || ''), [help, setHelp] = useState(cached?.help || 'unknown'), [taughtOn, setTaughtOn] = useState(cached?.taughtOn || stockholmDay)
  const [dirty, setDirty] = useState(Boolean(cached))
  const [reopen, setReopen] = useState(false), [savedDraft, setSavedDraft] = useState(null)
  const pendingNote = useRef(cached?.pending || null), pendingDraft = useRef(null)
  useEffect(() => {
    if (!dirty) return
    drafts.set(cacheKey, { note, help, taughtOn, pending: pendingNote.current })
    const protect = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [cacheKey, dirty, note, help, taughtOn])
  const base = `/api/teacher-students/${encodeURIComponent(receipt.studentId)}?classId=${encodeURIComponent(receipt.classId)}`
  const selected = history?.reports.find(report => report.id === review?.reportId)
  const latest = selected?.checkIns.at(-1)
  const teachingCheck = selected?.checkIns.findLast(check => check.teaching?.kind === 'teaching' && check.teaching.hypothesisId === review?.hypothesisId && check.teaching.packageId === pack.id && check.teaching.packageVersion === pack.version)
  const decision = latest?.decisions.find(decision => decision.hypothesisId === review?.hypothesisId)
  const needsReopen = ['revised', 'rejected'].includes(decision?.decision)
  const nextPhase = intent.didactic.phase === 'contrast' ? 'independent_check' : intent.didactic.phase === 'independent_check' ? 'later_check' : null

  async function load() {
    setBusy(true); setStatus('Läser rapportens avstämningar…')
    try {
      const data = await call(`${base}&resource=analysis`)
      if (pendingNote.current && data.revision !== pendingNote.current.expectedRevision
        && !data.reports.some(report => report.checkIns.some(check => check.requestId === pendingNote.current.requestId))) pendingNote.current = null
      setHistory(data); setStatus('Senaste avstämningarna är inlästa. Din text är kvar.')
    }
    catch (error) { setStatus(error.message) }
    finally { setBusy(false) }
  }
  async function saveNote(event) {
    event.preventDefault(); if (!selected) return
    setBusy(true); setStatus('Sparar undervisningsnotering…')
    try {
      pendingNote.current ||= { action: 'check_in', reportId: selected.id, expectedRevision: history.revision, requestId: crypto.randomUUID(),
        checkIn: { decisions: latest?.decisions || selected.report.hypotheses.map(h => ({ hypothesisId: h.id, decision: 'undecided', interpretationSv: '' })),
          goalSv: latest?.goalSv || `Följ upp ${pack.operationSv} med nya frågor.`, noteSv: latest?.noteSv || '',
          teaching: { hypothesisId: review.hypothesisId, packageId: pack.id, packageVersion: pack.version, draftId, materialVersion: version,
            taughtOn, help, noteSv: note, kind: intent.didactic.phase === 'contrast' ? 'teaching' : 'control_observation' } } }
      drafts.set(cacheKey, { note, help, taughtOn, pending: pendingNote.current })
      setHistory(await call(`${base}&resource=analysis`, pendingNote.current)); pendingNote.current = null; drafts.delete(cacheKey); setDirty(false)
      setStatus('Noteringen är sparad som en ny avstämning. Inget har delats ut.')
    } catch (error) { setStatus(error.message) }
    finally { setBusy(false) }
  }
  async function createControl() {
    if (!teachingCheck || !nextPhase || (needsReopen && !reopen)) return
    setBusy(true); setStatus('Kontrollerar underlag och förbereder privat utkast…')
    try {
      if (!pendingDraft.current) {
        const report = selected.report
        const current = await readEvidenceWindow(diagnosticRequest, base, report.period, report.source)
        const hypothesis = report.hypotheses.find(h => h.id === review.hypothesisId)
        const mapRefs = refs => refs.map(ref => {
          const original = report.evidence.find(entry => entry.ref === ref)
          const fresh = current.entries.find(entry => original && JSON.stringify(entry.reference) === JSON.stringify(original.reference))
          if (!fresh) throw new Error('Ett ursprungligt källsvar har ändrats. Skapa och granska en ny rapport.')
          return fresh.ref
        })
        const audience = await call(`/api/students?${new URLSearchParams({ resource: 'audience', targetType: 'student', targetId: receipt.studentId, limit: '1' })}`)
        const taskIds = tasks.filter(task => task.didacticRole === nextPhase).map(task => task.taskId)
        const input = { schemaVersion: 1, kind: 'screening', mode: 'specific', titleSv: `${nextPhase === 'independent_check' ? 'Ny kontroll' : 'Senare kontroll'}: ${pack.operationSv}`,
          goalSv: 'Undersök elevens sätt att räkna med en annan uppgift. Inga slutsatser om självständig förståelse dras automatiskt.',
          instructionSv: 'Räkna uppgiften. Visa hur du räknar i rutorna.', sourceMaterials: [],
          audience: { targetType: 'student', targetId: receipt.studentId, rosterRevision: audience.rosterRevision },
          classContexts: { [receipt.studentId]: receipt.classId },
          basis: [{ studentId: receipt.studentId, classId: receipt.classId, from: report.period.from, to: report.period.to, source: report.source,
            snapshotRevision: current.snapshotRevision, supportRefs: mapRefs(hypothesis.supportRefs), counterRefs: mapRefs(hypothesis.counterRefs), reasonSv: 'Samma ursprungliga stöd, kopplat till undervisningsnotering och ett nytt kontrollsteg.' }],
          investigation: { schemaVersion: 1, modelId: intent.modelId, ruleVersion: intent.ruleVersion,
            reportReview: { studentId: receipt.studentId, reportId: selected.id, hypothesisId: review.hypothesisId, checkInRevision: latest?.revision || 0, reopen },
            didactic: { packageId: pack.id, packageVersion: pack.version, phase: nextPhase, teachingRevision: teachingCheck.revision } },
          content: { taskIds, itemOptions: Object.fromEntries(taskIds.map(id => [id, { gridEnabled: true }])) } }
        const preview = await call('/api/teacher-material', { action: 'preview', material: input })
        pendingDraft.current = { action: 'save', material: input, requestId: crypto.randomUUID(), expectedRevision: 0, expectedContentRevision: preview.contentRevision }
      }
      setSavedDraft(await call('/api/teacher-material', pendingDraft.current))
      setStatus('Privat kontrollutkast sparat. Granska och dela ut vid valt tillfälle.')
    } catch (error) { setStatus(error.message) }
    finally { setBusy(false) }
  }
  return <section aria-label="Undervisning och nya kontroller" className="mt-3">
    <h4>{phaseLabel[intent.didactic.phase]}</h4>
    <p>{pack.alternativesSv}</p>
    <p>Rätta slutsvar visar inte i sig självständig förståelse. Samma fel bevisar inte återfall.</p>
    <details><summary>Lärargranskat förslag till bemötande</summary><p>{pack.teachingSv}</p><p>{pack.negativeControlSv}</p>{pack.scopeSv && <p>{pack.scopeSv}</p>}</details>
    {!review ? <p>En sparad rapport behövs för versionsbundna undervisningsnoteringar.</p> : <>
      <button type="button" disabled={busy} onClick={load}>Läs senaste avstämning</button>
      {selected && <>
        {selected.checkIns.filter(check => check.teaching?.hypothesisId === review.hypothesisId && check.teaching.packageId === pack.id && check.teaching.packageVersion === pack.version).map(check => <p key={check.revision}>Avstämning {check.revision} · {check.teaching.kind === 'teaching' ? 'undervisning' : 'kontrollobservation'} {check.teaching.taughtOn} · {({ unknown: 'Hjälp okänd', given: 'Hjälp gavs', none_reported: 'Ingen hjälp enligt läraren' })[check.teaching.help]}: {check.teaching.noteSv}</p>)}
        {intent.didactic.teaching && <p>Till denna kontroll hör undervisningsnotering {intent.didactic.teaching.checkInRevision}: {intent.didactic.teaching.noteSv}</p>}
        {!complete && <p>Prövningen är ännu inte fullständigt inlämnad och bedömd. Granska delresultaten innan nästa steg.</p>}
        <form aria-label="Undervisningsnotering" onSubmit={saveNote}>
          <label className="material-field">Datum för undervisning eller observation<input aria-label="Datum för undervisning eller observation" type="date" required value={taughtOn} onChange={event => { setTaughtOn(event.target.value); setDirty(true); pendingNote.current = null }} /></label>
          <label className="material-field">Vad gjorde ni?<textarea aria-label="Vad gjorde ni?" required maxLength={1500} value={note} onChange={event => { setNote(event.target.value); setDirty(true); pendingNote.current = null }} /></label>
          <label className="material-field">Hjälp vid arbetet<select aria-label="Hjälp vid arbetet" value={help} onChange={event => { setHelp(event.target.value); setDirty(true); pendingNote.current = null }}><option value="unknown">Okänt</option><option value="given">Hjälp gavs</option><option value="none_reported">Ingen hjälp enligt läraren</option></select></label>
          <button disabled={busy || !complete}>{intent.didactic.phase === 'contrast' ? 'Spara undervisningsnotering' : 'Spara kontrollobservation'}</button>
        </form>
        {nextPhase && <>
          {needsReopen && <label><input type="checkbox" checked={reopen} onChange={event => setReopen(event.target.checked)} /> Jag väljer att pröva den ursprungliga modellen igen med min ändrade tolkning kvar.</label>}
          <p>Kontrollfrågan kontrolleras mot tillgänglig träningshistorik och den valda klassens indexerade screeningar från 2024. Fullständigheten är okänd. För senare kontroll väljer du själv tillfället för utdelning.</p>
          <button type="button" disabled={busy || !complete || !teachingCheck || (needsReopen && !reopen) || Boolean(savedDraft)} onClick={createControl}>{nextPhase === 'independent_check' ? 'Skapa ny kontroll' : 'Skapa senare kontroll'}</button>
          {savedDraft && <a href={savedDraft.reviewPath}>Öppna kontrollutkast</a>}
        </>}
      </>}
    </>}
    {status && <p role="status">{status}</p>}
  </section>
}
