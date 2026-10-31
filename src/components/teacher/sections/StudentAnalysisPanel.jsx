import { useState } from 'react'
import { defaultEvidenceDays } from '../../../lib/evidencePeriod.js'
import { diagnosticRequest } from './diagnosticRequest.js'
import { isTeacherAdmin } from '../../../lib/teacherAuth.js'
import AnalysisCheckInForm from './AnalysisCheckInForm.jsx'
import PupilAnalysisReportView from './PupilAnalysisReportView.jsx'

export default function StudentAnalysisPanel({ studentId, classId, classIds = [], className }) {
  const [selectedClass, setSelectedClass] = useState(classId)
  const ids = [...new Set([classId, ...classIds].filter(Boolean))]
  return <>
    {ids.length > 1 && <label className="mt-3 block text-sm">Rapportens klass
      <select aria-label="Rapportens klass" className="ml-2 rounded border px-1.5 py-0.5" value={selectedClass} onChange={event => setSelectedClass(event.target.value)}>
        {ids.map(id => <option key={id} value={id}>{id === classId ? className || id : id}</option>)}
      </select>
    </label>}
    <AnalysisWorkspace key={selectedClass} studentId={studentId} classId={selectedClass} />
  </>
}

function AnalysisWorkspace({ studentId, classId }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState(() => ({ history: null, busy: false, message: '', draft: null, preview: null,
    selectedId: '', ...defaultEvidenceDays(), source: 'practice', requestId: '' }))
  const baseUrl = `/api/teacher-students/${encodeURIComponent(studentId)}?classId=${encodeURIComponent(classId)}`
  const endpoint = `${baseUrl}&resource=analysis`
  const update = patch => setState(value => ({ ...value, ...patch }))
  const selected = !state.preview && state.history?.reports.find(item => item.id === state.selectedId)
  async function request(body) {
    const result = await diagnosticRequest(endpoint, body ? { method: 'POST', body: JSON.stringify(body) } : {})
    if (!result.ok) throw new Error(result.data.error || 'Kunde inte läsa eller spara rapporten.')
    return result.data
  }
  async function run(action) {
    update({ busy: true, message: '' })
    try { await action() } catch (error) { update({ message: `${error.message} Osparad avstämning finns kvar i denna flik.` }) }
    finally { update({ busy: false }) }
  }
  async function load() {
    const history = await request()
    update({ history, message: 'Senaste sparade rapporter är inlästa.', selectedId: state.selectedId || history.reports.at(-1)?.id || '' })
  }
  return <section className="mt-4 rounded border border-teal-200 bg-white p-3 text-slate-900 shadow" aria-label="Analys och avstämning">
    <button type="button" aria-expanded={open} className="font-semibold text-teal-900" onClick={() => {
      setOpen(!open)
      if (!open && !state.history) run(load)
    }}>Analys och avstämning {open ? '▾' : '▸'}</button>
    {open && <div>
      <p className="mt-2 text-sm">Granska svar och pröva möjliga förklaringar. Din avstämning delar inte ut uppgifter och ändrar inte elevens nivå.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">Från<input disabled={state.busy} type="date" aria-label="Analys från" className="block rounded border px-1.5 py-0.5" value={state.from} onChange={event => update({ from: event.target.value })} /></label>
        <label className="text-sm">Till<input disabled={state.busy} type="date" aria-label="Analys till" className="block rounded border px-1.5 py-0.5" value={state.to} onChange={event => update({ to: event.target.value })} /></label>
        <label className="text-sm">Underlag<select aria-label="Underlag" disabled={state.busy} className="block rounded border px-1.5 py-0.5" value={state.source} onChange={event => update({ source: event.target.value })}>
          <option value="practice">Träningssvar</option>{isTeacherAdmin() && <><option value="screening">Screening</option><option value="all">Träning och screening</option></>}
        </select></label>
        <button type="button" disabled={state.busy} className="rounded border border-teal-700 px-2 py-1 text-sm" onClick={() => run(async () => {
          const data = await request({ action: 'draft', source: state.source, from: state.from, to: state.to })
          update({ draft: data.draft, preview: data.preview, requestId: crypto.randomUUID(), selectedId: '', message: 'Förhandsvisning. Inget har sparats eller delats ut.',
            history: { ...(state.history || { reports: [] }), revision: data.revision } })
        })}>Skapa granskningsunderlag</button>
        <button type="button" disabled={state.busy} className="rounded border px-2 py-1 text-sm" onClick={() => run(load)}>Läs senaste sparade</button>
      </div>
      {state.history?.reports.length > 0 && <label className="mt-3 block text-sm">Sparad rapportversion
        <select aria-label="Sparad rapportversion" disabled={state.busy} className="ml-2 rounded border px-1.5 py-0.5" value={state.selectedId} onChange={event => update({ selectedId: event.target.value, preview: null, draft: null })}>
          <option value="">Välj rapport</option>{state.history.reports.map(item => <option key={item.id} value={item.id}>Version {item.version} · {item.report.period.from}–{item.report.period.to}</option>)}
        </select>
      </label>}
      {state.history?.restrictedReports > 0 && <p className="text-sm mt-2">Vissa screeningrapporter kräver utökad behörighet.</p>}
      {state.preview && <><PupilAnalysisReportView key={state.requestId} report={state.preview} baseUrl={baseUrl} studentId={studentId} classId={classId} />
        <button type="button" disabled={state.busy} className="mt-3 rounded bg-teal-700 px-2 py-1 text-sm text-white" onClick={() => run(async () => {
          const history = await request({ action: 'create_report', report: state.draft, requestId: state.requestId,
            expectedRevision: state.history.revision, source: state.preview.source, from: state.preview.period.from, to: state.preview.period.to })
          update({ history, selectedId: history.affectedReportId, preview: null, draft: null, message: 'Rapportversionen är sparad. Stäm av tolkningen nedan.' })
        })}>Spara rapportversion</button>
      </>}
      {selected && <><PupilAnalysisReportView key={`report-${selected.id}`} report={selected.report} baseUrl={baseUrl} studentId={studentId} classId={classId} />
        <AnalysisCheckInForm key={`check-${selected.id}`} item={selected} scope={`${studentId}:${classId}`} busy={state.busy} onSave={async (checkIn, requestId) => {
          let saved = false
          await run(async () => {
            const history = await request({ action: 'check_in', reportId: selected.id, requestId, expectedRevision: state.history.revision, checkIn })
            update({ history, message: `Avstämningen för rapportversion ${selected.version} är sparad på servern. Inget har delats ut.` }); saved = true
          })
          return saved
        }} />
      </>}
      {state.message && <p role="status" className="mt-3 text-sm">{state.message}</p>}
    </div>}
  </section>
}
