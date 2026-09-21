import { ADAPTATION_ACTIONS } from '../../lib/adaptationDecision'
import { getOperationLabel } from '../../lib/operations'

function ProgressionMilestoneOverlay({ milestone, onContinue }) {
  const successPercent = milestone.attempts > 0
    ? Math.round((milestone.correct / milestone.attempts) * 100)
    : 0
  const continuation = milestone.action === ADAPTATION_ACTIONS.HOLD_FRAME
    ? 'Träningen fortsätter inom uppdragets ram.'
    : milestone.action === ADAPTATION_ACTIONS.COMPLETE_DOMAIN
      ? 'Du har nu klarat alla nivåer i området.'
      : 'Träningen fortsätter automatiskt med nästa steg.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-400 to-green-600">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Grattis!
        </h2>
        <p className="text-gray-600 mb-2">
          Du har klarat nivå {milestone.fromLevel} i {getOperationLabel(milestone.operation)}!
        </p>
        {milestone.attempts > 0 && (
          <p className="text-sm text-gray-500 mb-3">
            {milestone.correct}/{milestone.attempts} rätt ({successPercent}%)
          </p>
        )}
        <p className="text-gray-600 mb-6">{continuation}</p>
        <button
          type="button"
          onClick={onContinue}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
        >
          Fortsätt
        </button>
      </div>
    </div>
  )
}

export default ProgressionMilestoneOverlay
