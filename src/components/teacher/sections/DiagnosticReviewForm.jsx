import { useEffect, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest'

export default function DiagnosticReviewForm({ detail, onSaved, onDirtyChange }) {
  const [review, setReview] = useState(detail.review)
  const [note, setNote] = useState(detail.review?.note || '')
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

  async function save(event) {
    event.preventDefault()
    updateState({ busy: true, message: 'Sparar genomgången...', dirty: true })
    try {
      const result = await diagnosticRequest('/api/teacher-diagnostic-attempts', { method: 'POST', body: JSON.stringify({
        classId: detail.record.classIdAtAttempt, studentId: detail.record.studentId,
        assignmentId: detail.record.assignmentId, attemptId: detail.record.attemptId,
        expectedReviewRevision: review?.reviewRevision || 0,
        evidenceRevision: detail.record.serverRevision, evidenceSequence: detail.record.lastSequence, reviewed, note
      }) })
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte spara genomgången.')
      setReview(result.data.review)
      updateState({ busy: false, message: 'Genomgången är sparad på servern.', dirty: false })
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
    <p role="status" className="mt-1 text-sm">{state.message || (state.dirty ? 'Osparade ändringar i genomgången.' : '')}</p>
  </form>
}
