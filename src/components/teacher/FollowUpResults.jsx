import { useEffect, useState } from 'react'
import { CONTRAST_LABELS_SV } from '../../domains/predictableErrors/contrast.js'
import { MODEL_DESCRIPTIONS } from '../../domains/predictableErrors/modelDescriptions.js'
import { followUpSignal } from '../../lib/followUpSignal.js'
import { followUpProgress, readFollowUpAnswers } from '../../lib/followUpResults.js'
import { diagnosticRequest } from './sections/diagnosticRequest.js'

const label = id => CONTRAST_LABELS_SV[id] || id

export default function FollowUpResults({ material, dispatch }) {
  const [selectedId, setSelectedId] = useState('')
  const receipts = dispatch?.receipts?.filter(row => row.status === 'confirmed') || []
  const receipt = receipts.find(row => row.studentId === selectedId) || receipts[0]
  if (!receipt) return null
  const pupilName = id => material.audience.pupils.find(pupil => pupil.studentId === id)?.codeName || id
  return <section className="material-module" aria-label="Resultat av uppföljningen">
    <h3>Resultat</h3>
    {receipts.length > 1 ? <label>Svar för <select aria-label="Resultat för elev" value={receipt.studentId} onChange={event => setSelectedId(event.target.value)}>
      {receipts.map(row => <option key={row.studentId} value={row.studentId}>{pupilName(row.studentId)}</option>)}
    </select></label> : <p>Svar för {pupilName(receipt.studentId)}</p>}
    <FollowUpAnswers key={`${receipt.studentId}:${receipt.assignmentId}`} material={material} receipt={receipt} />
  </section>
}

function FollowUpAnswers({ material, receipt }) {
  const [refresh, setRefresh] = useState(0)
  const [state, setState] = useState({ refresh: -1, entries: [], message: '', status: 'loading' })
  const studentId = receipt.studentId, assignmentId = receipt.assignmentId
  const classId = material.classContexts?.[studentId] || material.basis?.find(item => item.studentId === studentId)?.classId
  useEffect(() => {
    if (!classId || !assignmentId) return
    let active = true
    readFollowUpAnswers({ request: diagnosticRequest, studentId, classId, assignmentId })
      .then(entries => active && setState({ refresh, status: 'ready', entries, message: '' }))
      .catch(error => active && setState({ refresh, status: 'error', entries: [], message: error.message }))
    return () => { active = false }
  }, [studentId, classId, assignmentId, refresh])

  if (!classId || !assignmentId) return <p role="status">Utdelningens klass eller uppdragsreferens saknas. Svaren kan inte kontrolleras.</p>
  const loading = state.refresh !== refresh
  const progress = followUpProgress(state.entries, material.content?.items)
  const observations = followUpSignal(state.entries)
  const descriptions = observations.models.filter(model => model.count >= 2 && MODEL_DESCRIPTIONS[model.modelId])
  return <>
    <div className="material-actions"><button disabled={loading} onClick={() => setRefresh(value => value + 1)}>Hämta svar igen</button></div>
    {loading ? <p role="status">Hämtar elevens svar…</p> : state.status === 'error' ? <p role="status">{state.message}</p> : <>
      {!state.entries.length && <p>Eleven har inte lämnat svar ännu.</p>}
      <p className="followup-note"><strong>{progress.complete ? 'Inlämnade svar' : 'Delresultat'}:</strong> {progress.expected === null
        ? 'Antalet frågor i den utdelade versionen är okänt.'
        : `${progress.assessed} av ${progress.expected} frågor har bedömda svar. ${progress.pending} återstår att besvara eller bedöma.`}
        {' '}{progress.submitted ? 'De hämtade försöken är inlämnade.' : 'Alla försök är inte inlämnade.'}</p>
      {!progress.consistent && state.entries.length > 0 && <p className="followup-note">Svaren kunde inte matchas fullständigt mot materialversionens frågor. Underlaget är inte en avslutad prövning.</p>}
      {state.entries.length > 0 && <>
        <table className="followup-results">
          <thead><tr><th>Fråga</th><th>Elevens svar</th><th>Facit</th><th>Stämmer med</th></tr></thead>
          <tbody>{state.entries.map(entry => {
            const matches = [...new Set((entry.interpretation?.predictable?.matches ?? []).map(m => m.modelId))]
            const assessed = ['correct', 'incorrect'].includes(entry.answer.status)
            return <tr key={entry.ref}>
              <td>{String(entry.question.promptSv || entry.question.promptText || '').replace(/^Räkna ut\s*/u, '').replace(/\.$/u, '')}</td>
              <td>{String(entry.answer.studentAnswer ?? '–')}</td><td>{String(entry.answer.correctAnswer ?? '–')}</td>
              <td>{!assessed ? 'Saknar bedömt svar' : entry.answer.status === 'correct' ? 'Rätt' : matches.length ? matches.map(label).join(' eller ') : 'Ingen känd förklaring'}</td>
            </tr>
          })}</tbody>
        </table>
        <p className="followup-signal"><strong>Observationer:</strong> {observations.correct} av {observations.total} bedömda svar är rätt.</p>
        {observations.models.length > 0 && <ul>{observations.models.map(model => <li key={model.modelId}>{label(model.modelId)}: {model.count} svar.</li>)}</ul>}
        <p className="followup-note">Prövningsavsikt saknas som strukturerat underlag i denna materialversion. Modellträffarna är observationer; samma svar kan passa flera förklaringar. Granska uträkningarna. Inga tips ges i appens screening; eventuell annan hjälp är inte fastställd.</p>
        {descriptions.map(model => {
          const description = MODEL_DESCRIPTIONS[model.modelId]
          return <div className="followup-thinking" key={model.modelId}>
            <p><strong>Om den möjliga förklaringen: {label(model.modelId)}</strong></p><p>{description.thinkingSv}</p><p className="followup-note">{description.sourceSv}</p>
            <details><summary>Möjliga samtalsingångar</summary><ul>{description.openersSv.map(text => <li key={text}>{text}</li>)}</ul>
              <p className="followup-note">Förslag, inte en arbetsgång. Du väljer själv.</p></details>
          </div>
        })}
      </>}
      <p className="followup-note">Räknehäftet för varje svar finns i elevprofilen under Analys och avstämning.</p>
    </>}
  </>
}
