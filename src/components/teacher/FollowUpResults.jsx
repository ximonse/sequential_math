import ReportReviewNote from './ReportReviewNote.jsx'
import WorkEvidenceNote from './WorkEvidenceNote.jsx'
import { useEffect, useState } from 'react'
import { CONTRAST_LABELS_SV } from '../../domains/predictableErrors/contrast.js'
import { modelDescription } from '../../domains/predictableErrors/modelDescriptions.js'
import { followUpSignal } from '../../lib/followUpSignal.js'
import { teacherAssessedNote } from '../../lib/evidenceTeacherAssessment.js'
import { followUpProgress, readFollowUpAnswers, repeatResults, resultTargets } from '../../lib/followUpResults.js'
import { diagnosticRequest } from './sections/diagnosticRequest.js'
import { investigationObservations } from '../../lib/materialInvestigation.js'
import DidacticFollowUp from './DidacticFollowUp.jsx'

const label = id => CONTRAST_LABELS_SV[id] || id

export default function FollowUpResults({ material, dispatch, draftId, version }) {
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
    <FollowUpAnswers key={`${receipt.studentId}:${receipt.assignmentId}`} material={material} receipt={receipt} draftId={draftId} version={version} />
  </section>
}

function FollowUpAnswers({ material, receipt, draftId, version }) {
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
  const multi = Array.isArray(material.investigations) ? material.investigations : null
  const targets = resultTargets(material, receipt, state.entries)
  const single = !multi && targets[0]
  const singlePlan = single && single.revisionOk ? single.investigation?.pupils.find(pupil => pupil.studentId === studentId && pupil.classId === classId) : null
  return <>
    <div className="material-actions"><button disabled={loading} onClick={() => setRefresh(value => value + 1)}>Hämta svar igen</button></div>
    {loading ? <p role="status">Hämtar elevens svar…</p> : state.status === 'error' ? <p role="status">{state.message}</p> : <>
      {!state.entries.length && <p>Eleven har inte lämnat svar ännu.</p>}
      <p className="followup-note"><strong>{progress.complete ? 'Inlämnade svar' : 'Delresultat'}:</strong> {progress.expected === null
        ? 'Antalet frågor i den utdelade versionen är okänt.'
        : `${progress.assessed} av ${progress.expected} frågor har bedömda svar. ${progress.pending} återstår att besvara eller bedöma.`}
        {' '}{progress.submitted ? 'De hämtade försöken är inlämnade.' : 'Alla försök är inte inlämnade.'}</p>
      {!progress.consistent && state.entries.length > 0 && <p className="followup-note">Svaren kunde inte matchas fullständigt mot materialversionens frågor. Underlaget är inte en avslutad prövning.</p>}
      {material.repeatCheck && <RepeatResult result={repeatResults(material, state.entries)} />}
      {targets.map((target, index) => <TargetResult key={target.investigation?.modelId || 'single'} {...target} studentId={studentId} classId={classId}
        heading={multi ? <h4 className="mt-3">Misstanke {index + 1} av {targets.length}: {label(target.investigation.modelId)}</h4> : null} />)}
      <p className="followup-note">Räknehäftet för varje svar finns i elevprofilen under Analys och avstämning.</p>
      {singlePlan && single.investigation.didactic && investigationObservations(singlePlan, state.entries).compatible
        && <DidacticFollowUp material={material} receipt={receipt} draftId={draftId} version={version} complete={progress.complete} />}
    </>}
  </>
}

function TargetResult({ investigation, revisionOk, entries, studentId, classId, heading }) {
  const plan = revisionOk ? investigation?.pupils.find(pupil => pupil.studentId === studentId && pupil.classId === classId) : null
  const outcome = plan && investigationObservations(plan, entries)
  const observations = investigation && (!plan || !outcome.compatible) ? null : outcome?.observations || followUpSignal(entries)
  const scope = entries[0]?.interpretation?.predictable?.scope
  const descriptions = (observations?.models || []).filter(model => model.count >= 2 && modelDescription(model.modelId, scope))
  return <>
    {heading}
      {investigation && !plan && <p role="status">Prövningsavsikten stämmer inte med utdelningskvittot eller elevens klass. Granska underlaget innan resultatet tolkas.</p>}
      {outcome && !outcome.compatible && <p role="status">Svaren eller facit stämmer inte med den granskade prövningen. Endast källsvaren visas.</p>}
      {plan && <p><strong>Prövar: {label(investigation.modelId)}</strong></p>}
      {plan && <ReportReviewNote review={plan.reportReview} />}
      {plan?.workEvidence?.some(entry => entry.teacherReview || entry.work?.signals.length || entry.work?.visibleResultWithExchangeMarks?.consistency === 'different') && <details><summary>Ursprungliga metodsignaler och försöksgranskning</summary>
        {plan.workEvidence.map(entry => <div key={entry.ref}><p>Försök: {entry.reference.attemptId}</p><WorkEvidenceNote work={entry.work} review={entry.teacherReview} /></div>)}
      </details>}
      {entries.length > 0 && <>
        <table className="followup-results">
          <thead><tr><th>Fråga</th><th>Elevens svar</th><th>Facit</th><th>Stämmer med</th></tr></thead>
          <tbody>{entries.map(entry => {
            const matches = plan ? outcome.matchesByRef.get(entry.ref) || [] : [...new Set((entry.interpretation?.predictable?.matches ?? []).map(m => m.modelId))]
            const assessed = ['correct', 'incorrect'].includes(entry.answer.status)
            return <tr key={entry.ref}>
              <td>{String(entry.question.promptSv || entry.question.promptText || '').replace(/^Räkna ut\s*/u, '').replace(/\.$/u, '')}</td>
              <td title={teacherAssessedNote(entry.answer) || undefined}>{String(entry.answer.studentAnswer ?? '–')}{entry.answer.teacherAssessed ? ' (L)' : ''}</td><td>{String(entry.answer.correctAnswer ?? '–')}</td>
              <td>{!observations ? 'Behöver granskas' : !assessed ? 'Saknar bedömt svar' : entry.answer.status === 'correct' ? 'Rätt' : matches.length ? matches.map(label).join(' eller ') : 'Ingen känd förklaring'}</td>
            </tr>
          })}</tbody>
        </table>
        {observations && <p className="followup-signal"><strong>Observationer:</strong> {observations.correct} av {observations.total} bedömda svar är rätt.</p>}
        {observations?.models.length > 0 && <ul>{observations.models.map(model => <li key={model.modelId}>{label(model.modelId)}: {model.count} svar{plan && model.modelId !== investigation.modelId ? ' · alternativ förklaring' : ''}.</li>)}</ul>}
        {plan ? <>
          {plan.unresolvedPairs.length > 0 && <p className="followup-note">Prövningen skiljer inte alla förklaringar åt: {plan.unresolvedPairs.map(pair => pair.map(id => id === 'correct' ? 'rätt svar' : label(id)).join(' / ')).join('; ')}.</p>}
          {outcome.compatible && outcome.newModels.length > 0 && <p className="followup-note">Andra träffar i aktuell analys, utanför den ursprungliga prövningen: {outcome.newModels.map(model => `${label(model.modelId)} (${model.count})`).join(', ')}.</p>}
          <p className="followup-note">Svaren jämförs med de förklaringar och modellsvar som granskades före utdelningen. Samma svar kan passa flera förklaringar. Granska uträkningarna och eventuell hjälp innan du värderar misstanken.</p>
        </> : <p className="followup-note">Prövningsavsikt saknas för resultatet. Modellträffarna är observationer; samma svar kan passa flera förklaringar. Granska uträkningarna.</p>}
        <p className="followup-note">Inga tips ges i appens screening; eventuell annan hjälp är inte fastställd.</p>
        {descriptions.map(model => {
          const description = modelDescription(model.modelId, scope)
          return <div className="followup-thinking" key={model.modelId}>
            <p><strong>Om den möjliga förklaringen: {label(model.modelId)}</strong></p><p>{description.thinkingSv}</p><p className="followup-note">{description.sourceSv}</p>
            <details><summary>Möjliga samtalsingångar</summary><ul>{description.openersSv.map(text => <li key={text}>{text}</li>)}</ul>
              <p className="followup-note">Förslag, inte en arbetsgång. Du väljer själv.</p></details>
          </div>
        })}
      </>}
  </>
}

const REPEAT_LABELS = { correct: 'Rätt nu – troligen slarv eller stress', same_wrong: 'Samma fel igen – troligen inlärt fel faktum',
  other_wrong: 'Annat fel – osäker, kanske gissning', unanswered: 'Inte besvarad än' }

function RepeatResult({ result }) {
  const answered = [...result.facts, ...result.fillers].filter(item => item.outcome !== 'unanswered')
  return <div className="followup-repeat">
    <h4 className="mt-3">Fråga igen</h4>
    <table className="followup-results">
      <thead><tr><th>Faktum</th><th>Tidigare svar</th><th>Nytt svar</th><th>Tolkning</th></tr></thead>
      <tbody>{result.facts.map(fact => <tr key={fact.prompt}>
        <td>{fact.prompt} = {fact.correct}</td><td>{String(fact.previousAnswer ?? '–')}</td>
        <td>{String(fact.entry?.answer.studentAnswer ?? '–')}</td><td>{REPEAT_LABELS[fact.outcome]}</td>
      </tr>)}</tbody>
    </table>
    {result.fillers.length > 0 && <p className="followup-note">Blandat med {result.fillers.length} fakta eleven tidigare svarat rätt på:
      {' '}{result.fillers.filter(item => item.outcome === 'correct').length} rätt nu.</p>}
    {answered.length > 0 && <p className="followup-note">Ett svar är en observation. Samma fel två gånger talar för ett inlärt fel faktum, men fråga gärna eleven hur hen tänkte.</p>}
  </div>
}
