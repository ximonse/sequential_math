function DashboardHeaderBar({
  isDirectStudentView,
  detailStudentName,
  onJumpToPasswordReset,
  onRefresh,
  onGoDashboard,
  onLogout
}) {
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
        {!isDirectStudentView && (
          <button
            onClick={onJumpToPasswordReset}
            className="px-3 py-2 bg-white hover:bg-gray-50 border rounded-lg text-sm text-gray-600"
          >
            Lösenord
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
