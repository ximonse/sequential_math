const LABELS = {
  synced: {
    title: 'Sparat',
    detail: 'Dina svar är bekräftade.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800'
  },
  syncing: {
    title: 'Sparar…',
    detail: 'Svaret är sparat på enheten och skickas nu.',
    className: 'border-sky-200 bg-sky-50 text-sky-800'
  },
  pending: {
    title: 'Sparat på enheten',
    detail: 'Väntar på kontakt med servern. Du kan fortsätta arbeta.',
    className: 'border-amber-200 bg-amber-50 text-amber-900'
  },
  local_only: {
    title: 'Sparat på enheten',
    detail: 'Den här inloggningen använder lokal lagring.',
    className: 'border-slate-200 bg-slate-50 text-slate-700'
  },
  error: {
    title: 'Kontrollera sparningen',
    detail: 'Svaret kunde inte sparas tryggt på enheten.',
    className: 'border-rose-200 bg-rose-50 text-rose-800'
  },
  idle: {
    title: 'Sparstatus',
    detail: 'Kontrolleras när du svarar.',
    className: 'border-slate-200 bg-white text-slate-500'
  }
}

export default function StudentSyncStatus({ status }) {
  const presentation = LABELS[status?.state] || LABELS.idle
  const detail = status?.state === 'pending' && status?.lastError
    ? status.lastError
    : presentation.detail

  return (
    <div
      className={`mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${presentation.className}`}
      role={status?.state === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="font-semibold">{presentation.title}</span>
      <span>{detail}</span>
    </div>
  )
}
