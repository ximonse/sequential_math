function CloudSyncStatusPanel({
  cloudSyncStatus,
  isCloudRefreshBusy,
  onRefreshNow,
  formatSyncTimestamp = value => String(value || ''),
  getCloudSyncSourceLabel = value => String(value || '')
}) {
  const hasError = Boolean(cloudSyncStatus.lastError)
  const isSynced = cloudSyncStatus.lastSuccessAt > 0 && !hasError
  const label = hasError
    ? `Synkproblem: ${cloudSyncStatus.lastError}`
    : isSynced
      ? 'Datakällan är synkad. Klicka för att hämta igen.'
      : 'Datakällan har inte verifierats. Klicka för att hämta igen.'
  const statusClass = hasError
    ? 'bg-rose-500'
    : isSynced
      ? 'bg-emerald-500'
      : 'bg-amber-400'

  return (
    <button
      type="button"
      onClick={onRefreshNow}
      disabled={isCloudRefreshBusy}
      className="group inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 disabled:cursor-wait"
      aria-label={label}
      title={label}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${statusClass} ${isCloudRefreshBusy ? 'animate-pulse' : ''}`} />
      <span className="sr-only">
        {label}. {cloudSyncStatus.localCount || 0} / {cloudSyncStatus.cloudCount || 0} / {cloudSyncStatus.mergedCount || 0}.
        {' '}{getCloudSyncSourceLabel(cloudSyncStatus.lastSource)}. {formatSyncTimestamp(cloudSyncStatus.lastAttemptAt)}
      </span>
    </button>
  )
}

export default CloudSyncStatusPanel
