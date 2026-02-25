import { getOperationLabel } from '../../lib/operations'

function LevelFocusMilestoneOverlay({
  milestone,
  onPracticeNextLevel,
  onStayCurrentLevel,
  onGoHome
}) {
  const nextLevel = milestone.level < 12 ? milestone.level + 1 : null
  const successPercent = milestone.attempts > 0
    ? Math.round((milestone.correct / milestone.attempts) * 100)
    : 0

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-400 to-green-600">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Grattis!
        </h2>
        <p className="text-gray-600 mb-2">
          Du har klarat nivå {milestone.level} i {getOperationLabel(milestone.operation)}!
        </p>
        <p className="text-sm text-gray-500 mb-6">
          {milestone.correct}/{milestone.attempts} rätt ({successPercent}%)
        </p>
        <div className="grid grid-cols-1 gap-3">
          {nextLevel && (
            <button
              onClick={() => onPracticeNextLevel(nextLevel)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
            >
              Öva nivå {nextLevel}
            </button>
          )}
          <button
            onClick={onStayCurrentLevel}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg"
          >
            Stanna kvar på nivå {milestone.level}
          </button>
          <button
            onClick={onGoHome}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Tillbaka till startsidan
          </button>
        </div>
      </div>
    </div>
  )
}

export default LevelFocusMilestoneOverlay
