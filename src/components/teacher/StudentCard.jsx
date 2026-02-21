function StudentCard({ student }) {
  const { studentId, name, stats, operationAbilities, recentProblems } = student

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

      <div className="grid grid-cols-2 gap-2 text-center mb-3">
        <div>
          <p className="text-xs text-gray-500">Problem</p>
          <p className="text-lg font-bold text-gray-700">{stats.totalProblems}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Rätt</p>
          <p className={`text-lg font-bold ${successColor}`}>
            {Math.round(successRate * 100)}%
          </p>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1">Nivå per räknesätt</p>
        <div className="flex gap-1.5 justify-center">
          <OperationLevel label="+" value={operationAbilities?.addition} />
          <OperationLevel label="−" value={operationAbilities?.subtraction} />
          <OperationLevel label="×" value={operationAbilities?.multiplication} />
          <OperationLevel label="÷" value={operationAbilities?.division} />
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
    add_1d_1d_no_carry: '1d+1d utan övergång',
    add_1d_1d_carry: '1d+1d med övergång',
    add_1d_2d_no_carry: '1d+2d utan övergång',
    add_1d_2d_carry: '1d+2d med övergång',
    add_2d_2d_no_carry: '2d+2d utan övergång',
    add_2d_2d_carry: '2d+2d med övergång',
    add_1d_3d_no_carry: '1d+3d utan övergång',
    add_1d_3d_carry: '1d+3d med övergång',
    add_2d_3d_no_carry: '2d+3d utan övergång',
    add_2d_3d_carry: '2d+3d med övergång',
    add_3d_3d_no_carry: '3d+3d utan övergång',
    add_3d_3d_carry: '3d+3d med övergång',
    sub_1d_1d_no_borrow: '1d-1d utan växling',
    sub_1d_1d_borrow: '1d-1d med växling',
    sub_2d_1d_no_borrow: '2d-1d utan växling',
    sub_2d_1d_borrow: '2d-1d med växling',
    sub_2d_2d_no_borrow: '2d-2d utan växling',
    sub_2d_2d_borrow: '2d-2d med växling',
    sub_3d_1d_no_borrow: '3d-1d utan växling',
    sub_3d_1d_borrow: '3d-1d med växling',
    sub_3d_2d_no_borrow: '3d-2d utan växling',
    sub_3d_2d_borrow: '3d-2d med växling',
    sub_3d_3d_no_borrow: '3d-3d utan växling',
    sub_3d_3d_borrow: '3d-3d med växling',
    div_1d_1d_easy: '1d÷1d enkel',
    div_2d_1d_basic: '2d÷1d grund',
    div_2d_1d_full: '2d÷1d full',
    div_3d_1d_easy: '3d÷1d enkel',
    div_3d_1d_full: '3d÷1d full',
    div_3d_2d_guided: '3d÷2d guidad',
    div_3d_2d_full: '3d÷2d full',
    div_4d_2d_guided: '4d÷2d guidad',
    div_4d_2d_full: '4d÷2d full',
    div_4d_3d_full: '4d÷3d full',
    mul_1d_1d_easy: '1d×1d enkel',
    mul_1d_1d_full: '1d×1d full',
    mul_1d_2d_no_carry: '1d×2d utan carry',
    mul_1d_2d_with_carry: '1d×2d med carry',
    mul_2d_2d_tens_friendly: '2d×2d tiotalsvänlig',
    mul_2d_2d_small: '2d×2d små tal',
    mul_2d_2d_full: '2d×2d full',
    mul_1d_3d: '1d×3d',
    mul_2d_3d_guided: '2d×3d guidad',
    mul_2d_3d_full: '2d×3d full',
    mul_dec_1dp_1d: 'decimal(1dp)×1d',
    mul_dec_1dp_1dp: 'decimal(1dp)×decimal(1dp)',
    mul_dec_2dp_1d: 'decimal(2dp)×1d',
    mul_dec_2dp_1dp: 'decimal(2dp)×decimal(1dp)'
  }
  return names[type] || type
}

function OperationLevel({ label, value }) {
  const level = Math.round(Number(value) || 1)
  return (
    <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
      <span className="text-blue-400">{label}</span>{level}
    </span>
  )
}

export default StudentCard
