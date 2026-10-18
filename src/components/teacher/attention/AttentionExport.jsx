import { useState } from 'react'
import { ATTENTION_LABELS } from '../../../lib/attentionHistory'
import { buildAttentionExport } from '../../../lib/attentionExport'
import { downloadTextFile, rowsToCsv } from '../sections/dashboardExportHelpers'

export default function AttentionExport({ rows, asOf }) {
  const [selection, setSelection] = useState({ studentId: 'all', mode: 'all', from: '', to: '', what: 'json' })
  const { studentId, mode, from, to, what } = selection
  const set = (key, value) => setSelection(previous => ({ ...previous, [key]: value }))
  const [status, setStatus] = useState('')
  const download = () => {
    try {
      const output = buildAttentionExport(rows, { studentId, mode, from, to, asOf })
      if (!output.json.records.length) { setStatus('Inga fokuspass i urvalet.'); return }
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      if (what === 'json') downloadTextFile(JSON.stringify(output.json, null, 2), `fokus_komplett_${stamp}.json`, 'application/json;charset=utf-8;')
      else {
        if (!output[what].length) { setStatus('Det valda råunderlaget saknas för dessa äldre pass. Välj komplett JSON för sammanfattningar och mätbeskrivning.'); return }
        downloadTextFile(rowsToCsv(output[what]), `fokus_${what}_${stamp}.csv`, 'text/csv;charset=utf-8;')
      }
      setStatus(`Export klar · ${output.json.records.length} försök. Underlaget hämtades ${new Date(asOf).toLocaleString('sv-SE')}.`)
    } catch (error) { setStatus(error.message) }
  }
  return <details className="focus-export"><summary>Exportera fokusdata</summary>
    <div className="focus-toolbar">
      <label>Vem<select aria-label="Elev för fokusexport" value={studentId} onChange={e => set('studentId', e.target.value)}><option value="all">Alla i vald klass/grupp</option>{rows.map(row => <option key={row.studentId} value={row.studentId}>{row.name}</option>)}</select></label>
      <label>Aktivitet<select aria-label="Aktivitet för fokusexport" value={mode} onChange={e => set('mode', e.target.value)}><option value="all">Alla fokusövningar</option>{Object.entries(ATTENTION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>Från<input aria-label="Fokusexport från" type="date" value={from} onChange={e => set('from', e.target.value)} /></label>
      <label>Till<input aria-label="Fokusexport till" type="date" value={to} onChange={e => set('to', e.target.value)} /></label>
      <label>Vad<select aria-label="Innehåll i fokusexport" value={what} onChange={e => set('what', e.target.value)}><option value="json">Komplett JSON med mätbeskrivning</option><option value="passes">Pass · CSV</option><option value="trials">Enskilda signaler · CSV</option><option value="events">Pauser och händelser · CSV</option></select></label>
      <button type="button" className="focus-action" onClick={download}>Ladda ner fokusdata</button>
    </div><p className="focus-muted">Tomma datumfält tar med hela arkivet. Alla försök behålls, även avbrott. JSON innehåller rådata, enheter, protokoll och förklaringar; CSV använder samma exportverktyg som matematikstatistiken.</p>
    {status && <p role="status">{status}</p>}
  </details>
}
