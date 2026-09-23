const LABELS = {
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
  }
}

export default function StudentSyncStatus({ status }) {
  // Normal background saves should not distract the pupil or shift the problem.
  if (status?.state !== 'error' && status?.state !== 'local_only'
    && !(status?.state === 'pending' && status?.lastError)) return null
  const presentation = LABELS[status.state]
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
