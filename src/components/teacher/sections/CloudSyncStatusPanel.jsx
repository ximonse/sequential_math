function CloudSyncStatusPanel({
  cloudSyncStatus,
  isCloudRefreshBusy,
  onRefreshNow,
  formatSyncTimestamp,
  getCloudSyncSourceLabel
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 border border-sky-100" style={{ order: -72 }}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="text-base font-semibold text-gray-800">Cloud-sync status</h2>
        <button
          type="button"
          onClick={onRefreshNow}
          disabled={isCloudRefreshBusy}
          className={`px-3 py-1.5 rounded text-xs ${isCloudRefreshBusy
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-sky-600 text-white hover:bg-sky-700'
            }`}
        >
          {isCloudRefreshBusy ? 'Hämtar...' : 'Hämta från server nu'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <div className="rounded border border-gray-100 bg-gray-50 p-2">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Senaste försök</div>
          <div className="font-medium text-gray-800">{formatSyncTimestamp(cloudSyncStatus.lastAttemptAt)}</div>
        </div>
        <div className="rounded border border-gray-100 bg-gray-50 p-2">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Senast lyckad</div>
          <div className="font-medium text-gray-800">{formatSyncTimestamp(cloudSyncStatus.lastSuccessAt)}</div>
        </div>
        <div className="rounded border border-gray-100 bg-gray-50 p-2">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Källa</div>
          <div className="font-medium text-gray-800">{getCloudSyncSourceLabel(cloudSyncStatus.lastSource)}</div>
        </div>
        <div className="rounded border border-gray-100 bg-gray-50 p-2">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Poster (lokal/cloud/synlig)</div>
          <div className="font-medium text-gray-800">
            {Number(cloudSyncStatus.localCount) || 0} / {Number(cloudSyncStatus.cloudCount) || 0} / {Number(cloudSyncStatus.mergedCount) || 0}
          </div>
        </div>
      </div>
      {cloudSyncStatus.lastError ? (
        <p className="mt-2 text-xs text-rose-700">
          Senaste fel: {cloudSyncStatus.lastError}
        </p>
      ) : (
        <p className="mt-2 text-xs text-emerald-700">
          Senaste hämtning ser ut att vara OK.
        </p>
      )}
    </div>
  )
}

export default CloudSyncStatusPanel
