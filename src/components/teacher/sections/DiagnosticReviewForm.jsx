import { useEffect, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest'

export default function DiagnosticReviewForm({ detail, onSaved, onDirtyChange }) {
  const [review, setReview] = useState(detail.review)
  const [note, setNote] = useState(detail.review?.note || '')
  const [feedbackText, setFeedbackText] = useState(detail.review?.feedback?.text || '')
  const [reviewed, setReviewed] = useState(Boolean(detail.review?.reviewed
    && detail.review.evidenceRevision === detail.record.serverRevision
    && detail.review.evidenceSequence === detail.record.lastSequence))
  const [state, setState] = useState({ busy: false, message: '', dirty: false })
  const stale = review && (review.evidenceRevision !== detail.record.serverRevision
    || review.evidenceSequence !== detail.record.lastSequence)
  useEffect(() => {
    if (!state.dirty) return undefined
    const protect = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [state.dirty])
  function updateState(next) { setState(next); onDirtyChange?.(next.dirty) }

  async function save(event, publishFeedback = false) {
    event.preventDefault()
    updateState({ busy: true, message: 'Sparar genomgången...', dirty: true })
    try {
      const result = await diagnosticRequest('/api/teacher-diagnostic-attempts', { method: 'POST', body: JSON.stringify({
        classId: detail.record.classIdAtAttempt, studentId: detail.record.studentId,
        assignmentId: detail.record.assignmentId, attemptId: detail.record.attemptId,
        expectedReviewRevision: review?.reviewRevision || 0,
        evidenceRevision: detail.record.serverRevision, evidenceSequence: detail.record.lastSequence, reviewed, note,
        ...(publishFeedback ? { publishFeedback: true, feedbackText } : {})
      }) })
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte spara genomgången.')
      setReview(result.data.review)
      updateState({ busy: false, message: publishFeedback ? 'Återkopplingen är skickad till eleven.' : 'Genomgången är sparad på servern.', dirty: false })
      onSaved?.()
    } catch (error) {
      updateState({ busy: false, message: `${error.message} Din text finns kvar här.`, dirty: true })
    }
  }

  return <form onSubmit={save} className="mb-3 rounded border border-orange-300 bg-orange-50 p-3" aria-label="Lärarens genomgång">
    <p className="text-sm">Gemensam läraranteckning för elevrevision {detail.record.serverRevision}. Anteckningen visas inte för eleven.</p>
    {stale && <p className="mt-1 text-sm font-semibold">Eleven har ändrat underlaget sedan föregående genomgång.</p>}
    <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={reviewed} disabled={state.busy}
      onChange={event => { setReviewed(event.target.checked); updateState({ busy: false, message: '', dirty: true }) }} />Den här elevrevisionen är genomgången</label>
    <label className="mt-2 block text-sm">Läraranteckning
      <textarea value={note} maxLength={1000} rows={3} disabled={state.busy}
        onChange={event => { setNote(event.target.value); updateState({ busy: false, message: '', dirty: true }) }}
        className="mt-1 block w-full rounded border border-orange-300 bg-white p-2" />
    </label>
    <button type="submit" disabled={state.busy || !state.dirty} className="mt-2 rounded bg-orange-700 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50">Spara genomgång</button>
    {detail.record.status === 'submitted' && <div className="mt-2 border-t border-orange-300 pt-2">
      <label className="block text-sm font-semibold">Återkoppling till eleven
        <textarea value={feedbackText} maxLength={1000} rows={2} disabled={state.busy}
          onChange={event => { setFeedbackText(event.target.value); updateState({ busy: false, message: '', dirty: true }) }}
          className="mt-1 block w-full rounded border border-orange-300 bg-white px-2 py-1 font-normal" />
      </label>
      <p className="text-xs">Bara den här texten skickas. Den interna läraranteckningen visas aldrig för eleven.</p>
      <button type="button" onClick={event => save(event, true)} disabled={state.busy || !feedbackText.trim()}
        className="mt-1 rounded bg-emerald-700 px-2 py-1 text-sm font-semibold text-white disabled:opacity-50">Skicka återkoppling</button>
    </div>}
    <p role="status" className="mt-1 text-sm">{state.message || (state.dirty ? 'Osparade ändringar i genomgången.' : '')}</p>
  </form>
}
