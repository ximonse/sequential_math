export default function InactivityAndClassLevelPanel({
  inactivityBuckets,
  classSummaries,
  weekGoal,
  toPercent
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Inaktivitet</h2>
          <span className="text-xs text-gray-500">Snabb uppföljning</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded bg-gray-50 px-3 py-2">
            <span className="text-gray-600">Inte aktiv idag</span>
            <span className="font-semibold text-gray-800">{inactivityBuckets.notActiveToday}</span>
          </div>
          <div className="flex items-center justify-between rounded bg-amber-50 px-3 py-2">
            <span className="text-amber-800">2+ dagar utan aktivitet</span>
            <span className="font-semibold text-amber-700">{inactivityBuckets.twoDaysOrMore}</span>
          </div>
          <div className="flex items-center justify-between rounded bg-red-50 px-3 py-2">
            <span className="text-red-700">7+ dagar utan aktivitet</span>
            <span className="font-semibold text-red-700">{inactivityBuckets.sevenDaysOrMore}</span>
          </div>
          <div className="flex items-center justify-between rounded bg-blue-50 px-3 py-2">
            <span className="text-blue-700">Ej startat alls</span>
            <span className="font-semibold text-blue-700">{inactivityBuckets.neverStarted}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 xl:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Klassnivå</h2>
          <span className="text-xs text-gray-500">Veckomål {weekGoal} uppgifter/elev</span>
        </div>
        {classSummaries.length === 0 ? (
          <p className="text-sm text-gray-500">Inga klasser i aktuellt urval.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-1 pr-2">Klass</th>
                  <th className="py-1 pr-2">Elever</th>
                  <th className="py-1 pr-2">Startat</th>
                  <th className="py-1 pr-2">Ej startat</th>
                  <th className="py-1 pr-2">Aktiva v</th>
                  <th className="py-1">Nått veckomål</th>
                </tr>
              </thead>
              <tbody>
                {classSummaries.map(item => (
                  <tr key={`class-summary-${item.classId}`} className="border-b last:border-b-0">
                    <td className="py-1 pr-2 text-gray-700 font-medium">{item.className}</td>
                    <td className="py-1 pr-2 text-gray-700">{item.studentCount}</td>
                    <td className="py-1 pr-2 text-green-700 font-semibold">{item.startedCount}</td>
                    <td className="py-1 pr-2 text-amber-700 font-semibold">{item.notStartedCount}</td>
                    <td className="py-1 pr-2 text-blue-700">{item.weeklyActiveCount}</td>
                    <td className="py-1 text-gray-700">
                      {item.weeklyGoalReachedCount}/{item.studentCount}{' '}
                      <span className="text-xs text-gray-500">({toPercent(item.weeklyGoalReachedRate)})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
