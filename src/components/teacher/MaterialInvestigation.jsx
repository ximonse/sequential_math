import { CONTRAST_LABELS_SV } from '../../domains/predictableErrors/contrast.js'
import ReportReviewNote from './ReportReviewNote.jsx'
import WorkEvidenceNote from './WorkEvidenceNote.jsx'
import TeachingRecordNote from './TeachingRecordNote.jsx'

const label = id => id === 'correct' ? 'rätt svar' : CONTRAST_LABELS_SV[id] || id

export default function MaterialInvestigation({ material }) {
  const plan = material.investigation
  if (!plan) return null
  return <section className="material-module" aria-label="Prövningsavsikt">
    <h2>Prövningsavsikt</h2><p><strong>Prövar:</strong> {label(plan.modelId)}</p>
    <p className="followup-note">En misstanke att undersöka, inte en fastställd felförståelse. Innehåll och mottagare granskas tillsammans.</p>
    {plan.didactic && <><p>Steg: {({ contrast: 'Prövning före undervisning', independent_check: 'Ny kontroll efter undervisning', later_check: 'Senare kontroll vid lärarvalt tillfälle' })[plan.didactic.phase]}.</p>
      <TeachingRecordNote record={plan.didactic.teaching} />{plan.didactic.controlObservations.map((record, index) => <TeachingRecordNote key={index} record={record} />)}</>}
    {plan.pupils.map(pupil => <div key={pupil.studentId}>
      <p>{material.audience.pupils.find(item => item.studentId === pupil.studentId)?.codeName || pupil.studentId}: {pupil.questions.length} frågor.</p>
      <ReportReviewNote review={pupil.reportReview} />
      {pupil.workEvidence?.some(entry => entry.teacherReview || entry.work?.signals.length || entry.work?.visibleResultWithExchangeMarks?.consistency === 'different') && <details><summary>Metodsignaler och försöksgranskning</summary>
        {pupil.workEvidence.map(entry => <div key={entry.ref}><p>Försök: {entry.reference.attemptId}</p><WorkEvidenceNote work={entry.work} review={entry.teacherReview} /></div>)}
      </details>}
      <p>Alternativ: {pupil.rivalModelIds.map(label).join(', ') || 'jämförelse med rätt svar'}.</p>
      {pupil.unresolvedPairs.length > 0 && <p>Frågorna skiljer inte alla förklaringar åt: {pupil.unresolvedPairs.map(pair => pair.map(label).join(' / ')).join('; ')}.</p>}
      <details><summary>Frågornas facit och modellsvar</summary>
        {pupil.questions.map(question => <div key={`${question.taskId}:${question.taskVersion}`}>
          <p><strong>{material.content.items.find(item => item.task.taskId === question.taskId && item.task.taskVersion === question.taskVersion)?.task.promptSv || 'Fråga'}</strong> · Facit: {String(question.correct)}</p>
          <ul>{Object.entries(question.predictions).map(([model, answers]) => <li key={model}>{label(model)}: {answers.join(' eller ')}</li>)}</ul>
        </div>)}
      </details>
    </div>)}
    <details><summary>Regelversion och underlag</summary><p>{plan.ruleVersion}</p>
      <p>Prövningen är bunden till analysens källsvar och denna materialversions frågor. Ändringar behöver granskas som en ny version.</p></details>
  </section>
}
