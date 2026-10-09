import taskPacks from '../../../domains/arithmetic/diagnosticTaskPacks.v1.json'
import DiagnosticAttemptHistory from './DiagnosticAttemptHistory'
import DiagnosticReviewForm from './DiagnosticReviewForm'
import { buildDiagnosticTeacherSupport } from '../../../domains/arithmetic/diagnosticTeacherSupport.js'

export default function DiagnosticEvidenceDetails({ detail, onSaved, onDirtyChange, reviewable = false }) {
  const guideFor = task => taskPacks.guides[task?.intentCode]
  const teacherSupport = buildDiagnosticTeacherSupport(detail)
  const answerLabels = { unanswered: 'inget slutsvar', incomplete: 'ofullständigt slutsvar',
    correct: 'rätt slutsvar', incorrect: 'fel slutsvar', unassessed: 'skrivsvar – bedöms av läraren' }
  const visibleResultReasons = { no_unique_aligned_setup: 'uppställningen inte är entydigt kolumnjusterad',
    no_complete_explicit_answer: 'ett fullständigt slutsvar saknas', no_result_row: 'resultatrad saknas',
    crossed_out_operand: 'en av talsiffrorna är överstruken', no_unambiguous_answer_line: 'ett entydigt svarsstreck saknas',
    no_unambiguous_result: 'ett entydigt resultat saknas under strecket',
    other_visible_work: 'det finns ytterligare arbete utanför uppställningen',
    result_outside_safe_range: 'resultatet ligger utanför säkert talintervall' }

  return (
    <section className="mt-4 rounded border border-orange-300 bg-white p-3" aria-label="Diagnostiskt elevunderlag">
        {reviewable && <DiagnosticReviewForm key={`${detail.record.attemptId}:${detail.record.serverRevision}`} detail={detail} onSaved={onSaved} onDirtyChange={onDirtyChange} />}
        <h4 className="font-semibold">{detail.task.promptSv}</h4>
        {guideFor(detail.task) && <div className="mt-2 rounded bg-orange-50 p-2 text-sm">
          <p><strong>Att granska:</strong> {guideFor(detail.task).goalSv}.</p>
          <p><strong>Fråga eleven:</strong> {guideFor(detail.task).questionSv}</p>
          <p className="text-xs">Lärarstöd för uppgiftens syfte; detta är inte en automatiskt konstaterad felorsak.</p>
        </div>}
        <p className="text-xs text-slate-700">Sparad elevrevision {detail.evidenceRevision.serverRevision} · {detail.evidenceRevision.lastSequence} {detail.evidenceRevision.lastSequence === 1 ? 'händelse' : 'händelser'}. Analysen beräknas när underlaget öppnas.</p>
        <p className="mt-1 whitespace-pre-wrap text-sm">Slutsvar: {detail.observation.explicitAnswer || 'inte skrivet'} · {answerLabels[detail.observation.answerStatus] || 'okänt'}</p>
        {detail.task.answerType !== 'text' && <><p className="text-sm">Kolumnplacering: {detail.columnAlignment.status === 'observed'
          ? detail.columnAlignment.alignment === 'aligned' ? 'entalen i samma kolumn' : 'entalen i olika kolumner'
          : 'kan inte avgöras säkert'}. Detta beskriver placeringen, inte varför eleven räknade så.</p>
        <p className="text-sm">Synligt resultat och slutsvar: {detail.visibleResult.status === 'observed'
          ? `${detail.visibleResult.visibleResult} i rutorna och ${detail.visibleResult.explicitAnswer} som slutsvar ${detail.visibleResult.consistency === 'same' ? 'stämmer överens' : 'skiljer sig åt'}. Resultatet lästes på rad ${detail.visibleResult.evidence.resultCells[0].row + 1}. Detta visar ingen orsak till skillnaden.`
          : `kan inte jämföras säkert eftersom ${visibleResultReasons[detail.visibleResult.reason] || 'underlaget är otydligt'}.`}</p></>}
        {detail.subtractionPattern.status !== 'not_applicable' && <p className="mt-1 text-sm">
          Subtraktionsmönster: {detail.subtractionPattern.status === 'matched'
            ? 'Resultatet 376 är förenligt med att ta större siffra minus mindre i varje kolumn. Fråga eleven hur tiotalet och lånet genom noll hanterades. Mönstret bevisar inte metoden.'
            : detail.subtractionPattern.status === 'no_match'
              ? 'Det synliga resultatet följer inte mönstret större minus mindre i varje kolumn.'
              : 'För lite entydigt underlag för att bedöma detta mönster.'}
        </p>}
        <DiagnosticAttemptHistory key={`${detail.record.attemptId}:${detail.record.serverRevision}`} snapshot={detail.snapshot} />
        {teacherSupport.length > 0 && <section aria-label="Lärarstöd utifrån underlaget" className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-sm">
          <h5 className="font-semibold">Möjliga frågor till eleven</h5>
          <p className="text-xs">Förslag för lärarens samtal. Underlaget visar ingen säker felorsak.</p>
          {teacherSupport.map(item => <div key={item.code} className="mt-2">
            <p><strong>Underlag:</strong> {item.reason}</p>
            <p><strong>Fråga eleven:</strong> {item.question}</p>
          </div>)}
        </section>}
        <p className="mt-2 text-xs text-slate-700">Uppgift {detail.record.taskId}, version {detail.record.taskVersion}. Analysversioner: kolumn {detail.columnAlignment.analysisVersion}, resultat {detail.visibleResult.analysisVersion}, subtraktion {detail.subtractionPattern.analysisVersion}. Händelser: {detail.snapshot.events.length}.</p>
      </section>
  )
}
