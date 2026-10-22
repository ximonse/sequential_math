import { ADAPTATION_ACTIONS } from '../../lib/adaptationDecision'
import { getOperationLabel } from '../../lib/operations'
import CompletionChoices from './CompletionChoices'

function ProgressionMilestoneOverlay({ milestone, onContinue, onGoHome }) {
  const successPercent = milestone.attempts > 0
    ? Math.round((milestone.correct / milestone.attempts) * 100)
    : 0
  const continuation = milestone.action === ADAPTATION_ACTIONS.HOLD_FRAME
    ? 'Träningen fortsätter inom uppdragets ram.'
    : milestone.action === ADAPTATION_ACTIONS.COMPLETE_DOMAIN
      ? 'Du har nu klarat alla nivåer i området.'
      : 'Träningen fortsätter automatiskt med nästa steg.'

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-emerald-400 to-green-600 px-4">
      <CompletionChoices choices={[
        { label: 'Fortsätt', onClick: onContinue, primary: true },
        ...(onGoHome ? [{ label: 'Till startsidan', onClick: onGoHome }] : [])
      ]} />
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
        <p className="text-gray-600">{continuation}</p>
      </div>
    </div>
  )
}

export default ProgressionMilestoneOverlay
