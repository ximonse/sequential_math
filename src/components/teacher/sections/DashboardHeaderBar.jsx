import CloudSyncStatusPanel from './CloudSyncStatusPanel'

function DashboardHeaderBar({
  isDirectStudentView,
  detailStudentName,
  teacherName,
  teacherRole,
  isAdmin,
  cloudSyncStatus,
  isCloudRefreshBusy,
  onRefreshNow,
  onJumpToPasswordReset,
  onRefresh,
  onGoDashboard,
  onGoAdmin,
  onLogout
}) {
  return (
    <header className="teacher-dashboard-header mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:pr-40">
      <div>
        <h1 className="text-2xl font-bold leading-tight text-gray-800">
          {isDirectStudentView ? 'Elevprofil' : 'Elevöversikt'}
        </h1>
        <p className="text-sm text-gray-600">
          {isDirectStudentView
            ? (detailStudentName || 'Välj en elev')
            : 'Överblick och nästa undervisningssteg'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <CloudSyncStatusPanel
          cloudSyncStatus={cloudSyncStatus}
          isCloudRefreshBusy={isCloudRefreshBusy}
          onRefreshNow={onRefreshNow}
        />
        <div className={`rounded-md border px-2 py-1 text-xs shadow-sm ${teacherRole === 'Huvudadministratör' ? 'border-violet-200 bg-violet-100 text-violet-950' : isAdmin ? 'border-orange-200 bg-orange-100 text-orange-950' : 'border-green-200 bg-green-100 text-green-950'}`} aria-label="Inloggat konto">
          <p className="font-semibold leading-tight">{teacherName}</p>
          <p className="text-[10px] leading-tight opacity-80">{teacherRole}</p>
        </div>
        {isAdmin && (
          <button
            onClick={onGoAdmin}
            className="rounded-md bg-indigo-600 px-2 py-1.5 text-xs text-white hover:bg-indigo-700"
          >
            Administration
          </button>
        )}
        {!isDirectStudentView && (
          <button
            onClick={onJumpToPasswordReset}
            className="rounded-md border bg-white px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Lösenord
          </button>
        )}
        <button
          onClick={onRefresh}
          className="rounded-md border bg-white px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          Uppdatera
        </button>
        {isDirectStudentView && (
          <button
            onClick={onGoDashboard}
            className="rounded-md bg-indigo-600 px-2 py-1.5 text-xs text-white hover:bg-indigo-700"
          >
            Elevöversikt
          </button>
        )}
        <button
          onClick={onLogout}
          className="rounded-md bg-gray-800 px-2 py-1.5 text-xs text-white hover:bg-gray-900"
        >
          Logga ut
        </button>
      </div>
    </header>
  )
}

export default DashboardHeaderBar
