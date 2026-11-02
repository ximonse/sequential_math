import { useEffect, useState } from 'react'
import { CONTRAST_LABELS_SV } from '../../domains/predictableErrors/contrast.js'
import { MODEL_DESCRIPTIONS } from '../../domains/predictableErrors/modelDescriptions.js'
import { followUpSignal } from '../../lib/followUpSignal.js'
import { stockholmDay } from '../../lib/evidencePeriod.js'
import { diagnosticRequest } from './sections/diagnosticRequest.js'

// Directed follow-up step 4: which explanation each answer matches, a signal and
// the thinking error. Advice to the teacher, never a conclusion (Simon 2026-10-31).
const label = id => CONTRAST_LABELS_SV[id] || id

async function assignmentAnswers(studentId, classId, assignmentId) {
  const base = `/api/teacher-students/${encodeURIComponent(studentId)}?classId=${encodeURIComponent(classId)}`
  const found = []
  let cursor = null
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ resource: 'evidence', source: 'screening', from: '2024-01-01', to: stockholmDay(), limit: '100', ...(cursor ? { cursor } : {}) })
    const result = await diagnosticRequest(`${base}&${params}`)
    if (!result.ok) throw new Error(result.data.error || 'Svaren kunde inte hämtas.')
    found.push(...result.data.entries.filter(entry => entry.reference?.assignmentId === assignmentId))
    if (!result.data.nextCursor) break
    cursor = result.data.nextCursor
  }
  return found
}


export default function FollowUpResults({ material, dispatch }) {
  const [state, setState] = useState({ status: 'loading', entries: [], message: '' })
  const receipt = dispatch?.receipts?.find(row => row.status === 'confirmed')
  const studentId = receipt?.studentId
  const classId = studentId && (material.classContexts?.[studentId] || material.basis?.find(item => item.studentId === studentId)?.classId)

  useEffect(() => {
    if (!studentId || !classId || !receipt?.assignmentId) return
    let active = true
    assignmentAnswers(studentId, classId, receipt.assignmentId)
      .then(entries => active && setState({ status: 'ready', entries, message: '' }))
      .catch(error => active && setState({ status: 'error', entries: [], message: error.message }))
    return () => { active = false }
  }, [studentId, classId, receipt?.assignmentId])

  if (!receipt) return null
  if (state.status === 'loading') return <section className="material-module" aria-label="Resultat av uppföljningen"><p role="status">Hämtar elevens svar…</p></section>
  if (state.status === 'error') return <section className="material-module" aria-label="Resultat av uppföljningen"><p role="status">{state.message}</p></section>
  if (!state.entries.length) return <section className="material-module" aria-label="Resultat av uppföljningen"><h3>Resultat</h3><p>Eleven har inte lämnat svar ännu.</p></section>

  const signal = followUpSignal(state.entries)
  const description = signal.modelId && MODEL_DESCRIPTIONS[signal.modelId]
  return <section className="material-module" aria-label="Resultat av uppföljningen">
    <h3>Resultat</h3>
    <table className="followup-results">
      <thead><tr><th>Fråga</th><th>Elevens svar</th><th>Facit</th><th>Stämmer med</th></tr></thead>
      <tbody>{state.entries.map(entry => {
        const matches = [...new Set((entry.interpretation?.predictable?.matches ?? []).map(m => m.modelId))]
        return <tr key={entry.ref}>
          <td>{String(entry.question.promptSv || entry.question.promptText || '').replace(/^Räkna ut\s*/u, '').replace(/\.$/u, '')}</td>
          <td>{String(entry.answer.studentAnswer ?? '–')}</td>
          <td>{String(entry.answer.correctAnswer ?? '–')}</td>
          <td>{entry.answer.status === 'correct' ? 'Rätt' : matches.length ? matches.map(label).join(' eller ') : 'Ingen känd förklaring'}</td>
        </tr>
      })}</tbody>
    </table>
    {signal.kind === 'supports' && <p className="followup-signal"><strong>Signal:</strong> {signal.count} av {signal.total} svar stämmer med ”{label(signal.modelId)}”. Det talar för misstanken. Du avgör om och när du undervisar.</p>}
    {signal.kind === 'against' && <p className="followup-signal"><strong>Signal:</strong> alla {signal.total} svar är rätt utan tips. Det talar emot misstanken.</p>}
    {signal.kind === 'unclear' && <p className="followup-signal"><strong>Signal:</strong> svaren pekar inte tydligt åt något håll. Titta i räknehäftet eller ta ett samtal.</p>}
    {description && <div className="followup-thinking">
      <p><strong>Om tankefelet</strong></p><p>{description.thinkingSv}</p><p className="followup-note">{description.sourceSv}</p>
      <details><summary>Möjliga samtalsingångar</summary><ul>{description.openersSv.map(text => <li key={text}>{text}</li>)}</ul>
        <p className="followup-note">Förslag, inte en arbetsgång. Du väljer själv.</p></details>
    </div>}
    <p className="followup-note">Räknehäftet för varje svar finns i elevprofilen under Analys och avstämning.</p>
  </section>
}
