function StudentCard({ student }) {
  const { studentId, name, stats, currentDifficulty, recentProblems } = student

  // Senaste aktivitet
  const lastActive = recentProblems[recentProblems.length - 1]?.timestamp
  const lastActiveText = lastActive
    ? formatTimeAgo(lastActive)
    : 'Aldrig'

  // Success rate färg
  const successRate = stats.overallSuccessRate || 0
  let successColor = 'text-gray-500'
  if (successRate >= 0.8) successColor = 'text-green-600'
  else if (successRate >= 0.6) successColor = 'text-yellow-600'
  else if (successRate > 0) successColor = 'text-red-600'

  // Trend (senaste 10 vs tidigare)
  const trend = calculateTrend(recentProblems)

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-gray-800">{name}</h3>
          <p className="text-xs text-gray-400 font-mono">{studentId}</p>
        </div>
        <span className="text-xs text-gray-400">{lastActiveText}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <p className="text-xs text-gray-500">Problem</p>
          <p className="text-lg font-bold text-gray-700">{stats.totalProblems}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Success</p>
          <p className={`text-lg font-bold ${successColor}`}>
            {Math.round(successRate * 100)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Nivå</p>
          <p className="text-lg font-bold text-blue-600">
            {Math.round(currentDifficulty)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all ${
            successRate >= 0.8 ? 'bg-green-500' :
            successRate >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${successRate * 100}%` }}
        />
      </div>

      {/* Trend indicator */}
      {trend !== 0 && (
        <p className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(Math.round(trend * 100))}% senaste 10
        </p>
      )}

      {/* Weaknesses */}
      {stats.weakestTypes && stats.weakestTypes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Behöver öva på:</p>
          <div className="flex flex-wrap gap-1">
            {stats.weakestTypes.slice(0, 2).map(type => (
              <span
                key={type}
                className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded"
              >
                {formatTypeName(type)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Formatera tid sedan senaste aktivitet
 */
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return 'Just nu'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min sedan`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} tim sedan`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} dagar sedan`
  return new Date(timestamp).toLocaleDateString('sv-SE')
}

/**
 * Beräkna trend (senaste 10 vs tidigare)
 */
function calculateTrend(problems) {
  if (problems.length < 15) return 0

  const last10 = problems.slice(-10)
  const previous = problems.slice(-20, -10)

  if (previous.length < 5) return 0

  const last10Rate = last10.filter(p => p.correct).length / last10.length
  const previousRate = previous.filter(p => p.correct).length / previous.length

  return last10Rate - previousRate
}

/**
 * Formatera template-namn till läsbart
 */
function formatTypeName(type) {
  const names = {
    'add_1digit_no_carry': '1-siffrig +',
    'add_1digit_with_carry': '1-siffrig + (tiövergang)',
    'add_2digit_no_carry': '2-siffrig +',
    'add_2digit_with_carry': '2-siffrig + (tiövergang)',
    'add_3digit_no_carry': '3-siffrig +',
    'add_3digit_with_carry': '3-siffrig + (tiövergang)'
  }
  return names[type] || type
}

export default StudentCard
