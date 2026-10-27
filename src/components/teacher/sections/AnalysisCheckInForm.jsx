import { useEffect, useRef, useState } from 'react'
import { getTeacherApiToken } from '../../../lib/teacherAuth.js'

// Unsaved text survives SPA navigation within this authenticated tab, but is not persisted or sent.
const drafts = new Map()
const initial = item => item.checkIns.at(-1) || { goalSv: '', noteSv: '', decisions: item.report.hypotheses.map(h => ({
  hypothesisId: h.id, decision: 'undecided', interpretationSv: '' })) }
const fields = value => ({ goalSv: value.goalSv, noteSv: value.noteSv, decisions: value.decisions })
const decisionLabels = { undecided: 'Behöver undersökas', accepted: 'Behåll som arbetshypotes', revised: 'Ändrad tolkning', rejected: 'Avfärdad' }

export default function AnalysisCheckInForm({ item, scope, busy, onSave }) {
  const cacheKey = `${getTeacherApiToken()}:${scope}:${item.id}`
  const [form, setForm] = useState(() => drafts.get(cacheKey)?.form || fields(initial(item)))
  const [dirty, setDirty] = useState(() => drafts.has(cacheKey))
  const pending = useRef(drafts.get(cacheKey)?.requestId || null)
  useEffect(() => {
    if (!dirty) return
    const protect = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [dirty])
  function change(next) { setForm(next); setDirty(true); drafts.set(cacheKey, { form: next, requestId: null }); pending.current = null }
  return <form aria-label="Lärarens analysavstämning" className="mt-4 space-y-3" onSubmit={async event => {
    event.preventDefault()
    pending.current ||= crypto.randomUUID()
    drafts.set(cacheKey, { form, requestId: pending.current })
    if (await onSave(form, pending.current)) { drafts.delete(cacheKey); setDirty(false); pending.current = null }
  }}>
    <h4 className="font-semibold">Din avstämning</h4>
    <p className="text-sm">Gäller den här sparade rapportversionen. En behållen arbetshypotes är ingen fastställd diagnos.</p>
    {item.report.hypotheses.map((h, index) => <fieldset key={h.id} className="border-l-2 border-slate-300 pl-3">
      <legend className="text-sm">{h.textSv}</legend>
      <label className="block text-sm">Ställningstagande
        <select aria-label={`Ställningstagande ${index + 1}`} value={form.decisions.find(d => d.hypothesisId === h.id)?.decision || 'undecided'}
          className="ml-2 rounded border px-1.5 py-0.5" onChange={event => change({ ...form, decisions: form.decisions.map(d => d.hypothesisId === h.id ? { ...d, decision: event.target.value } : d) })}>
          <option value="undecided">Behöver undersökas</option><option value="accepted">Behåll som arbetshypotes</option>
          <option value="revised">Ändra tolkningen</option><option value="rejected">Avfärda hypotesen</option>
        </select>
      </label>
      <label className="block text-sm mt-1">Din tolkning
        <textarea aria-label={`Din tolkning ${index + 1}`} maxLength={1000} value={form.decisions.find(d => d.hypothesisId === h.id)?.interpretationSv || ''}
          className="block w-full rounded border p-2" rows={2} onChange={event => change({ ...form, decisions: form.decisions.map(d => d.hypothesisId === h.id ? { ...d, interpretationSv: event.target.value } : d) })} />
      </label>
    </fieldset>)}
    <label className="block text-sm">Nästa mål
      <textarea aria-label="Nästa mål" required maxLength={1000} value={form.goalSv} onChange={event => change({ ...form, goalSv: event.target.value })} className="block w-full rounded border p-2" rows={2} />
    </label>
    <label className="block text-sm">Anteckning till avstämningen
      <textarea aria-label="Anteckning till avstämningen" maxLength={1500} value={form.noteSv} onChange={event => change({ ...form, noteSv: event.target.value })} className="block w-full rounded border p-2" rows={2} />
    </label>
    <div className="flex flex-wrap items-center gap-3">
      <button disabled={busy || !dirty} className="rounded bg-teal-700 px-2 py-1 text-sm font-semibold text-white disabled:opacity-50">Spara avstämning</button>
      <button type="button" disabled={busy} className="rounded border px-2 py-1 text-sm" onClick={() => {
        if (dirty && !window.confirm('Kasta din osparade avstämning och återgå till senast sparade?')) return
        drafts.delete(cacheKey); setForm(fields(initial(item))); setDirty(false); pending.current = null
      }}>Återgå till senast sparade</button>
      <span className="text-sm">{dirty ? 'Osparade ändringar' : item.checkIns.length ? `Sparad avstämning ${item.checkIns.length}` : 'Ingen avstämning sparad'}</span>
    </div>
    {item.checkIns.length > 0 && <details className="text-sm"><summary>Avstämningshistorik ({item.checkIns.length})</summary>
      {item.checkIns.map(check => <div key={check.revision} className="mt-2 border-l-2 pl-3"><p>Avstämning {check.revision} · {new Date(check.createdAt).toLocaleString('sv-SE')}</p>
        <p>{check.goalSv}</p><p>{check.noteSv}</p>{check.decisions.map(d => <p key={d.hypothesisId}>{decisionLabels[d.decision]}: {d.interpretationSv}</p>)}</div>)}
    </details>}
  </form>
}
