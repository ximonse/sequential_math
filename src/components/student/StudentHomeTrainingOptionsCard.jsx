import { geometryGroups } from '../../domains/geometry/groups.js'
import { conceptDecks } from '../../lib/conceptPractice.js'

export default function StudentHomeTrainingOptionsCard({
  operationKeys,
  onStartOperationPractice,
  getOperationLabel,
  operationProgress,
  talbildEnabled = false,
  onStartTalbild,
  onStartGeometryPractice,
  onStartConceptPractice
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
      <h2 className="text-base font-semibold text-gray-800 mb-3">Välj träning</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {talbildEnabled && (
          <button
            onClick={onStartTalbild}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 border border-red-300 hover:bg-red-100 text-red-800"
          >
            Talbild
          </button>
        )}
        {operationKeys.map(operation => {
          let btnClass
          if (operation === 'algebra_evaluate' || operation === 'algebra_simplify') {
            btnClass = 'bg-indigo-50 border border-indigo-300 hover:bg-indigo-100 text-indigo-800'
          } else if (operation === 'fractions') {
            btnClass = 'bg-lime-50 border border-lime-300 hover:bg-lime-100 text-lime-800'
          } else if (operation === 'arithmetic_expressions') {
            btnClass = 'bg-rose-50 border border-rose-300 hover:bg-rose-100 text-rose-800'
          } else if (operation === 'percentage') {
            btnClass = 'bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-800'
          } else {
            btnClass = 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
          }
          const progress = operationProgress?.[operation]
          const progressPercent = progress ? Math.round(progress.ratio * 100) : 0
          return (
            <button
              key={operation}
              onClick={() => onStartOperationPractice(operation)}
              className={`relative overflow-hidden px-4 py-2 rounded-lg text-sm font-medium ${btnClass}`}
            >
              {progressPercent > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-green-200/40"
                  style={{ width: `${progressPercent}%` }}
                />
              )}
              <span className="relative flex items-center justify-center gap-1.5">
                {getOperationLabel(operation)}
                {progressPercent > 0 && (
                  <span className="text-[10px] opacity-80">{progressPercent}%</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      {[
        { id: 'geometry', title: 'Geometri', choices: Object.entries(geometryGroups), onStart: onStartGeometryPractice },
        { id: 'concept', title: 'Begrepp', choices: Object.values(conceptDecks).map(deck => [deck.id, deck.title]), onStart: onStartConceptPractice }
      ].map(({ id, title, choices, onStart }) => (
        <section key={id} className="mt-4 border-t border-gray-200 pt-3" aria-labelledby={id + '-practice-title'}>
          <h3 id={id + '-practice-title'} className="mb-2 text-sm font-semibold text-gray-800">{title}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {choices.map(([key, label]) => (
              <button type="button" key={key} onClick={() => onStart(key)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {label}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
