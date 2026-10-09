import { useNavigate } from 'react-router-dom'

export default function StudentDiagnosticCollections({ assignments, studentId }) {
  const navigate = useNavigate()
  const active = assignments.filter(item => item.submissionStatus !== 'submitted')
  const submitted = assignments.filter(item => item.submissionStatus === 'submitted')
  function open(item) {
    if (!item?.items.length) return
    const task = item.items.find(task => task.attemptStatus !== 'submitted') || item.items[0]
    navigate(`/student/${studentId}/diagnostic?assignment=${encodeURIComponent(item.assignmentId)}&item=${encodeURIComponent(task.assignmentItemId)}`)
  }
  return <section className="mb-3 rounded-lg border border-orange-300 bg-orange-50 p-2" aria-label="Dina samlingar">
    <h2 className="text-lg font-semibold text-orange-950">Digitalt räknehäfte</h2>
    {active.length > 0 && <div className="mt-1 grid gap-1">
      {active.map(item => <div key={item.assignmentId} className="flex flex-wrap items-center gap-x-2">
        <button type="button" onClick={() => open(item)} className="rounded border border-orange-600 bg-white px-2 py-1 font-semibold text-orange-950">
          {item.titleSv || 'Screening'}
        </button>
        <span className="text-sm text-orange-900">{item.items.length} frågor · {item.submissionStatus === 'in_progress' ? 'Pågår' : 'Ej påbörjad'}</span>
      </div>)}
    </div>}
    {submitted.length > 0 && <label className="mt-2 block text-sm font-semibold">Inlämnade samlingar
      <select value="" onChange={event => open(submitted.find(item => item.assignmentId === event.target.value))}
        className="ml-2 max-w-full rounded border border-orange-400 bg-white px-2 py-1 font-normal">
        <option value="">Välj tidigare samling</option>
        {submitted.map(item => <option key={item.assignmentId} value={item.assignmentId}>
          {item.titleSv || 'Screening'} · {item.feedbackAvailable ? 'Återkoppling finns' : 'Inlämnad'}
        </option>)}
      </select>
    </label>}
  </section>
}
