import ThemeSwitcher from '../../shared/ThemeSwitcher'

function DashboardHeaderBar({
  isDirectStudentView,
  detailStudentName,
  onJumpToPasswordReset,
  onRefresh,
  onGoDashboard,
  onLogout,
  accountName,
  accountLabel,
  cloudSyncStatus,
  isCloudRefreshBusy,
  onRefreshCloud
}) {
  const syncIsHealthy = Boolean(cloudSyncStatus?.lastSuccessAt) && !cloudSyncStatus?.lastError
  const syncLabel = syncIsHealthy ? 'Datakällan är synkad' : 'Datakällan behöver kontrolleras'

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          {isDirectStudentView ? 'Elevprofil' : 'Elevöversikt'}
        </h1>
        <p className="text-gray-600">
          {isDirectStudentView
            ? (detailStudentName || 'Välj en elev')
            : 'Överblick och nästa undervisningssteg'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <ThemeSwitcher />
        <div className="flex items-center gap-2 px-1" title={syncLabel}>
          <button
            type="button"
            onClick={onRefreshCloud}
            disabled={isCloudRefreshBusy}
            aria-label={syncLabel}
            className={`h-3 w-3 rounded-full ring-2 ring-white shadow-sm ${syncIsHealthy ? 'bg-emerald-500' : 'bg-rose-500'} ${isCloudRefreshBusy ? 'animate-pulse' : ''}`}
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-800">{accountName || 'Lärare'}</p>
            <p className="text-[11px] text-gray-600">{accountLabel || 'Lärare'}</p>
          </div>
        </div>
        {!isDirectStudentView && (
          <button
            onClick={onJumpToPasswordReset}
            className="px-3 py-2 bg-white hover:bg-gray-50 border rounded-lg text-sm text-gray-600"
          >
            Äldre inloggningar
          </button>
        )}
        <button
          onClick={onRefresh}
          className="px-3 py-2 bg-white hover:bg-gray-50 border rounded-lg text-sm text-gray-600"
        >
          Uppdatera
        </button>
        {isDirectStudentView && (
          <button
            onClick={onGoDashboard}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
          >
            Elevöversikt
          </button>
        )}
        <button
          onClick={onLogout}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm"
        >
          Logga ut
        </button>
      </div>
    </div>
  )
}

export default DashboardHeaderBar
