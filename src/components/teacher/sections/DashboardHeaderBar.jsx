function DashboardHeaderBar({
  isDirectStudentView,
  detailStudentName,
  syncSubtitle,
  onJumpToPasswordReset,
  onRefresh,
  onGoStudentPage,
  onGoDashboard,
  onBack,
  onLogout
}) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          {isDirectStudentView ? 'Elevprofil' : 'Elevöversikt'}
        </h1>
        <p className="text-gray-600">
          {isDirectStudentView
            ? `All tillgänglig elevdata ${detailStudentName ? `- ${detailStudentName}` : ''}`
            : 'Matteträning - Dashboard'}
        </p>
      </div>

      <div className="flex gap-4">
        {!isDirectStudentView && (
          <button
            onClick={onJumpToPasswordReset}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
          >
            Lösenord (längst ner)
          </button>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-white hover:bg-gray-50 border rounded-lg text-gray-600"
          >
            Uppdatera
          </button>
          <span className="text-[10px] text-gray-400 max-w-[120px] leading-tight">
            {syncSubtitle}
          </span>
        </div>
        {!isDirectStudentView && (
          <button
            onClick={onGoStudentPage}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            Elevsida
          </button>
        )}
        {isDirectStudentView && (
          <button
            onClick={onGoDashboard}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            Till dashboard
          </button>
        )}
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Tillbaka
        </button>
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg"
        >
          Logga ut
        </button>
      </div>
    </div>
  )
}

export default DashboardHeaderBar
