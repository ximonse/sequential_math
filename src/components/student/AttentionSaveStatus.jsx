export default function AttentionSaveStatus({ status }) {
  if (!status.hasResult) return <p className="my-4 text-sm" role="status">Introduktionen sparas inte.</p>
  const messages = {
    idle: 'Förbereder sparande…', saving: 'Sparar resultatet…', saved: 'Resultatet är sparat.',
    pending: 'Resultatet finns på den här enheten och väntar på synkning.',
    error: 'Resultatet kunde inte sparas. Försök igen innan du lämnar sidan.'
  }
  return <div className="my-4 text-sm"><p role="status">{messages[status.state]}</p>
    {['pending', 'error'].includes(status.state) && <button type="button" className="mt-2 rounded-xl border border-current px-4 py-2" onClick={status.retry}>Försök spara igen</button>}
  </div>
}
