import { getOperationLabel } from '../../lib/operations'

function AdvancePromptOverlay({
  advancePrompt,
  onAccept,
  onDecline
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 to-cyan-600">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg text-center">
        <div className="text-5xl mb-3">📈</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Stabil nivå!
        </h2>
        <p className="text-gray-600 mb-2">
          Du är stabil på nivå {advancePrompt.fromLevel} i {getOperationLabel(advancePrompt.operation)}.
        </p>
        <p className="text-gray-600 mb-6">
          Vill du prova nivå {advancePrompt.nextLevel}?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onAccept}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
          >
            Ja, testa nästa nivå
          </button>
          <button
            onClick={onDecline}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg"
          >
            Stanna kvar lite till
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdvancePromptOverlay
