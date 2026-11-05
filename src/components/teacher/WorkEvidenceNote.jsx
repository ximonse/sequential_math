export default function WorkEvidenceNote({ work, review }) {
  if (!work && !review) return null
  const expanded = work?.visibleResultWithExchangeMarks
  const expandedOnly = expanded?.status === 'observed' && expanded.consistency === 'different' && work.visibleResult?.status !== 'observed'
  return <div className="mt-2 text-sm" aria-label="Källbunden metodsignal">
    {work?.status === 'unknown' && <p>Metodläsningen är okänd: uppgiftens identitet eller arbetsformat kunde inte verifieras. Originalet behöver granskas.</p>}
    {work?.signals.map(signal => <p key={signal.code}><strong>{signal.label}:</strong> {signal.message}</p>)}
    {expandedOnly && <p>Utökad läsning med växlingsmarkeringar: {expanded.visibleResult} i häftet och {expanded.explicitAnswer} i svarsfältet. Den strikta läsningen är okänd. Orsaken behöver granskas.</p>}
    {review && <p><strong>Försöksgranskning {review.reviewRevision}:</strong> {review.matchesEvidence ? review.reviewed ? 'Markerad granskad för denna evidensrevision.' : 'Inte markerad granskad.' : 'Äldre granskning; elevunderlaget har ändrats.'} {review.noteSv}</p>}
  </div>
}
