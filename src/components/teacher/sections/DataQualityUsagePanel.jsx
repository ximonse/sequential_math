export default function DataQualityUsagePanel({
  dataQualitySummary,
  usageInsights,
  formatDuration,
  toPercent
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Datakvalitet</h2>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${dataQualitySummary.overallQuality >= 0.8
            ? 'bg-green-100 text-green-700'
            : dataQualitySummary.overallQuality >= 0.6
              ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'
            }`}>
            {Math.round(dataQualitySummary.overallQuality * 100)}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-gray-500 text-xs">Telemetry täckning</p>
            <p className="font-semibold text-gray-800">
              {dataQualitySummary.withTelemetry}/{dataQualitySummary.totalStudents}
            </p>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-gray-500 text-xs">Närvarosignal idag</p>
            <p className="font-semibold text-gray-800">
              {dataQualitySummary.withPresenceToday}/{dataQualitySummary.totalStudents}
            </p>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-gray-500 text-xs">Session-gap idag</p>
            <p className="font-semibold text-gray-800">{dataQualitySummary.sessionGapStudents}</p>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-gray-500 text-xs">Datamismatch idag</p>
            <p className="font-semibold text-gray-800">{dataQualitySummary.answerMismatchStudents}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Behöver extra koll: {dataQualitySummary.needsFollowUpNames.length > 0
            ? dataQualitySummary.needsFollowUpNames.join(', ')
            : 'Ingen just nu'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Insikter från användning (7d)</h2>
          <span className="text-xs text-gray-500">För förbättring av appen</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2">
            <p className="text-blue-700 text-xs">Tid på uppgift / aktiv elev</p>
            <p className="font-semibold text-blue-800">
              {formatDuration(usageInsights.avgEngagedSecondsPerActiveStudent)}
            </p>
          </div>
          <div className="rounded border border-indigo-200 bg-indigo-50 px-3 py-2">
            <p className="text-indigo-700 text-xs">Median sessionslängd</p>
            <p className="font-semibold text-indigo-800">
              {formatDuration(usageInsights.medianSessionDurationSeconds)}
            </p>
          </div>
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-amber-700 text-xs">Pausacceptans</p>
            <p className="font-semibold text-amber-800">{toPercent(usageInsights.breakTakeRate)}</p>
          </div>
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-emerald-700 text-xs">Ticket träffsäkerhet (idag)</p>
            <p className="font-semibold text-emerald-800">{toPercent(usageInsights.ticketAccuracyToday)}</p>
          </div>
        </div>
        <p className="text-xs text-gray-600">
          Vanligaste träningsstart: {usageInsights.topLaunchModes.length > 0
            ? usageInsights.topLaunchModes.map(item => `${item.label} (${item.count})`).join(', ')
            : 'Ingen data ännu'}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Vanligaste felkategori: {usageInsights.topErrorCategories.length > 0
            ? usageInsights.topErrorCategories.map(item => `${item.label} (${item.count})`).join(', ')
            : 'Ingen data ännu'}
        </p>
      </div>
    </div>
  )
}
