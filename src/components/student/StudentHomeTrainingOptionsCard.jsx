import { PROGRESSION_MODE_STEADY } from '../../lib/progressionModes'
import { STANDARD_OPERATIONS } from '../../lib/operations'

export default function StudentHomeTrainingOptionsCard({
  selectedProgressionMode,
  progressionModeOptions,
  onSelectProgressionMode,
  getProgressionModeLabel,
  onStartFreePractice,
  operationKeys,
  onStartOperationPractice,
  getOperationLabel
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
      <h2 className="text-base font-semibold text-gray-800 mb-3">Välj träning</h2>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs text-gray-500">Tempo</span>
        {progressionModeOptions.map(modeOption => (
          <button
            key={modeOption}
            type="button"
            onClick={() => onSelectProgressionMode(modeOption)}
            className={`px-3 py-1.5 rounded text-xs font-semibold ${
              selectedProgressionMode === modeOption
                ? modeOption === PROGRESSION_MODE_STEADY
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {getProgressionModeLabel(modeOption)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={onStartFreePractice}
          className={`px-4 py-2 rounded-lg text-white text-sm font-semibold ${
            selectedProgressionMode === PROGRESSION_MODE_STEADY
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          Fri träning ({getProgressionModeLabel(selectedProgressionMode)})
        </button>
        {operationKeys.map(operation => {
          let btnClass
          if (operation === 'algebra_evaluate' || operation === 'algebra_simplify') {
            btnClass = 'bg-indigo-50 border border-indigo-300 hover:bg-indigo-100 text-indigo-800'
          } else if (operation === 'fractions') {
            btnClass = 'bg-lime-50 border border-lime-300 hover:bg-lime-100 text-lime-800'
          } else if (operation === 'arithmetic_expressions') {
            btnClass = 'bg-rose-50 border border-rose-300 hover:bg-rose-100 text-rose-800'
          } else if (selectedProgressionMode === PROGRESSION_MODE_STEADY) {
            btnClass = 'bg-green-50 border border-green-300 hover:bg-green-100 text-green-800'
          } else {
            btnClass = 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
          }
          return (
            <button
              key={operation}
              onClick={() => onStartOperationPractice(operation)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${btnClass}`}
            >
              {getOperationLabel(operation)} ({getProgressionModeLabel(selectedProgressionMode)})
            </button>
          )
        })}
      </div>
    </div>
  )
}
