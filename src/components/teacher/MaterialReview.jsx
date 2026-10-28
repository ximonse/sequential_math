import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { diagnosticRequest } from './sections/diagnosticRequest.js'
import QuestionText from '../QuestionText.jsx'
import ScreeningImageQuestion from '../student/ScreeningImageQuestion.jsx'
import './materialReview.css'
import MaterialBasis from './MaterialBasis.jsx'
import MaterialPracticeSummary from './MaterialPracticeSummary.jsx'
import MaterialDispatchStatus from './MaterialDispatchStatus.jsx'

const endpoint = '/api/teacher-material'
async function request(body, human = false) {
  const options = { method: 'POST', body: JSON.stringify(body) }
  const result = human ? await fetch(endpoint, { ...options, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } })
    .then(async response => ({ ok: response.ok, status: response.status, data: await response.json() })) : await diagnosticRequest(endpoint, options)
  if (!result.ok) throw Object.assign(new Error(result.data.error || 'Åtgärden kunde inte genomföras. Din text är kvar.'), { status: result.status, code: result.data.code })
  return result.data
}

export default function MaterialReview() {
  const { draftId } = useParams(), [search] = useSearchParams()
  const [draft, setDraft] = useState(null), [version, setVersion] = useState(null)
  const [edits, setEdits] = useState({}), [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [checked, setChecked] = useState(false)
  const [dispatches, setDispatches] = useState([]), [classes, setClasses] = useState([])
  const requestIds = useRef({})
  const activeScope = useRef(draftId)
  const url = `${endpoint}?${new URLSearchParams({ draftId })}`
  useEffect(() => {
    let active = true
    activeScope.current = draftId
    diagnosticRequest(url).then(result => {
      if (!active) return
      if (!result.ok) { setMessage(result.data.error || 'Utkastet kunde inte läsas.'); return }
      setDraft(result.data.draft)
      setDispatches(result.data.dispatches || [])
      const requested = Number(search.get('version'))
      setVersion(result.data.draft.versions.some(item => item.version === requested) ? requested : result.data.draft.versions.at(-1).version)
    }).catch(() => { if (active) setMessage('Utkastet kunde inte hämtas.') })
    diagnosticRequest('/api/students?resource=classes&limit=100').then(result => { if (active && result.ok) setClasses(result.data.classes) }).catch(() => {})
    return () => { active = false; if (activeScope.current === draftId) activeScope.current = '' }
  }, [url, search, draftId])
  const item = draft?.versions.find(value => value.version === version)
  const input = edits[version] || item?.input
  const dirty = item && JSON.stringify(input) !== JSON.stringify(item.input)
  const hasUnsaved = draft && Object.entries(edits).some(([key, value]) => JSON.stringify(value) !== JSON.stringify(draft.versions.find(v => v.version === Number(key))?.input))
  useEffect(() => {
    if (!hasUnsaved) return
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsaved])
  const material = preview?.material || item?.material
  const latest = item && item.version === draft.versions.at(-1).version
  const approved = item && (draft.approvals || []).some(value => value.version === item.version && value.contentRevision === item.contentRevision)
  const dispatch = dispatches.find(value => value.version === item?.version)
  function edit(field, value) {
    setEdits(old => ({ ...old, [version]: { ...input, [field]: value } }))
    setPreview(null); setChecked(false); setMessage('')
  }
  async function run(action) {
    setBusy(true); setMessage('')
    try { await action() } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }
  async function refresh(selected = version) {
    const result = await diagnosticRequest(url)
    if (!result.ok) throw new Error(result.data.error || 'Läs senaste status innan du försöker igen.')
    setDraft(result.data.draft); setDispatches(result.data.dispatches || []); setVersion(selected); setChecked(false); setPreview(null)
  }
  const keyFor = action => `${action}:${draftId}:${item.version}:${item.contentRevision}:${preview?.contentRevision || ''}`
  function requestId(action) {
    const key = keyFor(action)
    return requestIds.current[key] ||= crypto.randomUUID()
  }
  async function save() {
    const result = await request({ action: 'save', material: input, draftId, expectedRevision: draft.revision,
      expectedContentRevision: preview.contentRevision, requestId: requestId('save') })
    await refresh(result.savedVersion)
    setEdits(old => { const next = { ...old }; delete next[version]; return next })
    setMessage('Ny version sparad. Den behöver granskas före godkännande.')
  }
  async function approve() {
    await request({ action: 'approve', draftId, expectedRevision: draft.revision, version,
      contentRevision: item.contentRevision, requestId: requestId('approve') }, true)
    await refresh(); setMessage('Innehåll och mottagare är godkända. Inget är utdelat.')
  }
  async function publish() {
    const id = requestId('publish')
    let result
    try {
      do {
        result = await request({ action: 'publish', draftId, expectedRevision: draft.revision, version,
          contentRevision: item.contentRevision, requestId: id }, true)
        if (activeScope.current !== draftId) return
        setDispatches(old => [...old.filter(value => value.version !== version), result.dispatch])
        setMessage(`${result.dispatch.confirmed} av ${material.audience.total} mottagare är bekräftade.`)
      } while (result.hasMore && activeScope.current === draftId)
    } catch (error) {
      if (error.status && error.status < 500 && !['dispatch_conflict', 'dispatch_unavailable', 'draft_access_denied'].includes(error.code)) throw error
      try {
        await refresh()
        setMessage('Senaste utdelningskvittot är hämtat efter anslutningsfelet. Kontrollera mottagarnas status.')
        return
      } catch {
        if (activeScope.current === draftId) setDispatches(old => old.some(value => value.version === version) ? old
          : [...old, { version, confirmed: 0, failed: 0, unknown: material.audience.total, pending: 0, status: 'uncertain', receipts: [] }])
        throw new Error('Utdelningskvittensen är osäker. Läs senaste status innan du följer upp samma utdelning.')
      }
    }
    delete requestIds.current[keyFor('publish')]
    if (activeScope.current === draftId) await refresh()
  }
  return <main className="material-review">
    <header className="material-review-header"><Link to="/teacher">← Lärarvyn</Link><span>Materialutkast</span>
      <button disabled={busy || !draft} onClick={() => run(() => refresh())}>Läs senaste status</button></header>
    {message && <p role="status" className="material-message">{message}</p>}
    {!item ? <p>Läser utkast…</p> : <>
      <div className="material-title"><div><p>{material.mode === 'specific' ? 'Analysspecifikt' : 'Generellt'} · {material.kind === 'screening' ? 'Screening' : 'Träningsuppdrag'}</p>
        <h1>{input.titleSv}</h1></div>
        <label>Version <select aria-label="Utkastversion" value={version} onChange={event => { setVersion(Number(event.target.value)); setPreview(null); setChecked(false) }}>
          {draft.versions.map(value => <option key={value.version} value={value.version}>{value.version}{value.version === draft.versions.at(-1).version ? ' · senaste' : ''}</option>)}
        </select></label></div>
      <div className="material-columns"><div className="material-main">
        <section className="material-module"><h2>Mål och beställning</h2>
          <div className="material-field"><label htmlFor="material-title">Rubrik</label><input id="material-title" value={input.titleSv} maxLength={100} onChange={event => edit('titleSv', event.target.value)} /></div>
          <div className="material-field"><label htmlFor="material-goal">Undervisningsmål</label><textarea id="material-goal" value={input.goalSv} maxLength={1000} onChange={event => edit('goalSv', event.target.value)} /></div>
          <div className="material-field"><label htmlFor="material-instruction">Beställning till innehållet</label><textarea id="material-instruction" value={input.instructionSv} maxLength={2000} onChange={event => edit('instructionSv', event.target.value)} /></div>
          {material.sourceMaterials.map((source, index) => <details key={index}><summary>{source.label}</summary><p>{source.excerpt}</p></details>)}
          <div className="material-actions"><button disabled={busy || !dirty} onClick={() => run(async () => setPreview(await request({ action: 'preview', material: input })))}>Förhandsvisa ändring</button>
            <button disabled={busy || !dirty || !preview} onClick={() => run(save)}>Spara som ny version</button></div>
        </section>
        <section className="material-module"><h2>{material.kind === 'screening' ? 'Frågor och bedömning' : 'Träningsram'}</h2>
          {material.kind === 'screening' ? material.content.items.map(({ task, marking }, index) => <article className="material-question" key={task.taskId}>
            <h3>Fråga {index + 1}</h3><QuestionText>{task.promptSv}</QuestionText>
            {task.responseMode && <ScreeningImageQuestion task={task} disabled context={{ teacher: true }} />}
            <p><strong>{task.answerRule === 'teacher_review' ? 'Lärarbedömning' : 'Facit:'}</strong> {marking.expectedAnswer ?? ''}</p>
          </article>) : <MaterialPracticeSummary frame={material.content.frame} />}
        </section>
        {material.basis.length > 0 && <section className="material-module"><h2>Varför detta innehåll?</h2>
          {material.basis.map((basis, index) => <MaterialBasis key={`${version}:${index}:${basis.snapshotRevision}`} basis={basis}
            codeName={material.audience.pupils.find(pupil => pupil.studentId === basis.studentId)?.codeName || basis.studentId} />)}
          <p>Beläggen behöver lärargranskas. Giltiga referenser bevisar inte slutsatsen.</p>
        </section>}
      </div><aside className="material-sidebar"><section className="material-module"><h2>Mottagare</h2>
        <p>{material.audience.name} · {material.audience.total} elever</p>
        <ul>{material.audience.pupils.map(pupil => <li key={pupil.studentId}><Link to={`/teacher/student/${encodeURIComponent(pupil.studentId)}`}>{pupil.codeName}</Link>
          {material.mode === 'specific' && material.pupilsWithoutAnalysis.includes(pupil.studentId) ? ' · analysunderlag saknas' : ''}
          {material.kind === 'screening' && (pupil.classIds.length > 1 && material.audience.targetType !== 'class'
            ? <label className="material-class-context">Klass för {pupil.codeName}<select aria-label={`Klass för ${pupil.codeName}`}
              value={input.classContexts?.[pupil.studentId] || material.classContexts?.[pupil.studentId] || ''}
              onChange={event => edit('classContexts', { ...input.classContexts, [pupil.studentId]: event.target.value })}>
              <option value="">Välj klass</option>{pupil.classIds.map(id => <option key={id} value={id}>{classes.find(value => value.classId === id)?.name || id}</option>)}
            </select></label> : <small>Klass: {classes.find(value => value.classId === material.classContexts?.[pupil.studentId])?.name || material.audience.name}</small>)}
        </li>)}</ul>
        <button disabled={busy} onClick={() => run(async () => {
          const result = await diagnosticRequest(`/api/students?${new URLSearchParams({ resource: 'audience', targetType: input.audience.targetType, targetId: input.audience.targetId, limit: 1 })}`)
          if (!result.ok) throw new Error(result.data.error || 'Mottagarna kunde inte läsas.')
          edit('audience', { ...input.audience, rosterRevision: result.data.rosterRevision })
          setMessage('Aktuellt urval läst. Förhandsvisa och spara om listan har ändrats.')
        })}>Läs aktuellt urval</button>
      </section><section className="material-module"><h2>Granska och godkänn</h2>
        <p>{approved ? `Version ${version} är godkänd.` : `Version ${version} väntar på granskning.`}</p>
        {!latest && <p>En nyare version finns. Godkänn den senaste versionen.</p>}
        {dirty && <p>Du har osparade ändringar i den här versionen.</p>}
        <label className="material-check"><input type="checkbox" checked={checked} disabled={busy || dirty || !latest || approved}
          onChange={event => setChecked(event.target.checked)} />Jag har granskat innehåll, bedömning och mottagare för version {version}.</label>
        <button className="material-primary" disabled={busy || !checked || dirty || !latest || approved} onClick={() => run(approve)}>Godkänn version {version}</button>
      </section><section className="material-module"><h2>Utdelning</h2>
        <MaterialDispatchStatus dispatch={dispatch} pupils={material.audience.pupils} />
        <div className="material-actions"><button className="material-primary" disabled={busy || !approved || dirty || !latest || dispatch?.status === 'complete'} onClick={() => run(publish)}>
          {dispatch ? 'Följ upp återstående mottagare' : `Dela ut till ${material.audience.total} ${material.audience.total === 1 ? 'elev' : 'elever'}`}
        </button></div>
      </section></aside></div>
    </>}
  </main>
}
