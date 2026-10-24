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
  onShowPupilNames,
  fillingPupilNames,
  onShowCodeNames,
  pupilLabelsShown = false,
  onJumpToPasswordReset,
  onGoDashboard,
  onLogout
}) {
  return (
    <header className="teacher-dashboard-header mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:pr-40">
      <div>
        <h1 className="text-2xl font-bold leading-tight text-gray-800">
          {isDirectStudentView ? 'Elevprofil' : 'Elevöversikt'}
        </h1>
        <p className="text-sm text-gray-600">
          {isDirectStudentView ? (detailStudentName || 'Välj en elev') : 'Överblick och nästa undervisningssteg'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <CloudSyncStatusPanel cloudSyncStatus={cloudSyncStatus} isCloudRefreshBusy={isCloudRefreshBusy} onRefreshNow={onRefreshNow} />
        <button type="button" onClick={pupilLabelsShown ? onShowCodeNames : onShowPupilNames} disabled={fillingPupilNames}
          className="rounded-md bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-800 hover:bg-violet-200 disabled:opacity-50">
          {fillingPupilNames ? 'Hämtar namn…' : pupilLabelsShown ? 'Byt till kodnamn' : 'Visa tilltalsnamn'}
        </button>
        <div className={`rounded-md border px-2 py-1 text-xs shadow-sm ${teacherRole === 'Huvudadministratör' ? 'border-violet-200 bg-violet-100 text-violet-950' : isAdmin ? 'border-orange-200 bg-orange-100 text-orange-950' : 'border-green-200 bg-green-100 text-green-950'}`} aria-label="Inloggat konto">
          <p className="font-semibold leading-tight">{teacherName}</p>
          <p className="text-[10px] leading-tight opacity-80">{teacherRole}</p>
        </div>
        {!isDirectStudentView && <button onClick={onJumpToPasswordReset} className="rounded-md border bg-white px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50">Äldre inloggningar</button>}
        {isDirectStudentView && <button onClick={onGoDashboard} className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-xs text-white hover:bg-indigo-700">Elevöversikt</button>}
        <button onClick={onLogout} className="rounded-md bg-gray-800 px-1.5 py-0.5 text-xs text-white hover:bg-gray-900">Logga ut</button>
      </div>
    </header>
  )
}

export default DashboardHeaderBar
