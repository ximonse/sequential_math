const labels = { undecided: 'Behöver undersökas', accepted: 'Behållen arbetshypotes', revised: 'Ändrad tolkning', rejected: 'Avfärdad hypotes' }

export default function ReportReviewNote({ review }) {
  if (!review) return null
  return <div className="mt-2 text-sm" aria-label="Rapportens avstämning">
    <p><strong>{labels[review.decision]}</strong> · rapportversion {review.reportVersion}, avstämning {review.checkInRevision}.</p>
    {review.interpretationSv && <p>{review.interpretationSv}</p>}
    {review.goalSv && <p>Lärarens mål: {review.goalSv}</p>}
    {review.reopen && <p>Läraren valde uttryckligen att pröva den ursprungliga modellen igen.</p>}
  </div>
}
