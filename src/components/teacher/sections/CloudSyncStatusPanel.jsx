function CloudSyncStatusPanel({
  cloudSyncStatus,
  isCloudRefreshBusy,
  onRefreshNow,
  formatSyncTimestamp,
  getCloudSyncSourceLabel
}) {
  const hasError = Boolean(cloudSyncStatus.lastError)
  const statusLabel = hasError
    ? 'Synkproblem'
    : cloudSyncStatus.lastSuccessAt > 0
      ? 'Synkad'
      : 'Inte verifierad'

  return (
    <details
      className="bg-white rounded-lg shadow mb-4 border border-sky-100"
    >
      <summary className="cursor-pointer select-none px-4 py-3 flex items-center justify-between gap-3">
        <span className="font-semibold text-gray-700">Datakälla</span>
        <span className={`text-xs ${hasError ? 'text-rose-700' : 'text-gray-500'}`}>{statusLabel}</span>
      </summary>
      <div className="border-t border-gray-100 p-4">
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={onRefreshNow}
            disabled={isCloudRefreshBusy}
            className={`px-3 py-1.5 rounded text-xs ${isCloudRefreshBusy
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
          >
            {isCloudRefreshBusy ? 'Hämtar...' : 'Hämta igen'}
          </button>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div><dt className="text-xs text-gray-500">Senaste försök</dt><dd>{formatSyncTimestamp(cloudSyncStatus.lastAttemptAt)}</dd></div>
          <div><dt className="text-xs text-gray-500">Senast lyckad</dt><dd>{formatSyncTimestamp(cloudSyncStatus.lastSuccessAt)}</dd></div>
          <div><dt className="text-xs text-gray-500">Källa</dt><dd>{getCloudSyncSourceLabel(cloudSyncStatus.lastSource)}</dd></div>
          <div>
            <dt className="text-xs text-gray-500">Lokala / cloud / synliga</dt>
            <dd>{Number(cloudSyncStatus.localCount) || 0} / {Number(cloudSyncStatus.cloudCount) || 0} / {Number(cloudSyncStatus.mergedCount) || 0}</dd>
          </div>
        </dl>
        {hasError && <p className="mt-3 text-xs text-rose-700">{cloudSyncStatus.lastError}</p>}
      </div>
    </details>
  )
}

export default CloudSyncStatusPanel
