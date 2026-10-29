export default function MaterialDispatchStatus({ dispatch, pupils }) {
  if (!dispatch) return <p>Den här versionen är inte utdelad.</p>
  return <section aria-label="Utdelningsstatus" className="material-dispatch">
    <p><strong>Bekräftat utdelat till {dispatch.confirmed} av {pupils.length} {pupils.length === 1 ? 'elev' : 'elever'}.</strong></p>
    {dispatch.pending > 0 && <p>{dispatch.pending} mottagare väntar på bekräftelse.</p>}
    {dispatch.unknown > 0 && <p>Kvittens saknas för {dispatch.unknown} mottagare. Följ upp samma utdelning.</p>}
    {dispatch.failed > 0 && <p>{dispatch.failed} mottagare behöver följas upp.</p>}
    <details><summary>Visa kvitto per mottagare</summary><ul>{pupils.map(pupil => {
      const row = dispatch.receipts.find(value => value.studentId === pupil.studentId)
      return <li key={pupil.studentId}><strong>{pupil.codeName}</strong>: {row?.status === 'confirmed' ? 'Utdelat'
        : row?.message || 'Status behöver följas upp'}</li>
    })}</ul></details>
  </section>
}
