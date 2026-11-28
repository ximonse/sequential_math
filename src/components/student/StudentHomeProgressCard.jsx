import { getOperationLabel } from '../../lib/operations'
import OperationMasteryRows from './OperationMasteryRows'

function AreaProgressRow({ label, onStart, children }) {
  return <li className="flex items-center justify-between gap-3 py-2">
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-800">{label}</p>
      <p className="mt-0.5 text-sm text-gray-600">{children}</p>
    </div>
    <button type="button" className="min-h-11 shrink-0 rounded-lg border border-blue-200 px-3 text-sm font-medium text-blue-900 hover:bg-blue-50"
      aria-label={'Öva ' + label} onClick={onStart}>Öva</button>
  </li>
}

export default function StudentHomeProgressCard({
  operationMasteryBoards,
  onSelectLevel,
  geometryProgress,
  conceptProgress,
  onStartGeometryPractice,
  onStartConceptPractice,
  masteryMinAttempts,
  masteryMinSuccessRate
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Framsteg</h2>
      <section aria-labelledby="level-progress-title">
        <h3 id="level-progress-title" className="mb-1 text-sm font-semibold text-gray-800">Räknesätt och nivåträning</h3>
        <p className="text-xs text-gray-500 mb-3">
          Klarad = minst {masteryMinAttempts} försök och minst {Math.round(masteryMinSuccessRate * 100)}% rätt. Tryck på en ruta för att öva den nivån.
        </p>
        <div className="flex flex-wrap gap-2 text-[11px] mb-4">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border-2 border-green-500 bg-green-200 text-green-900">
            Klarad (vecka)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-green-300 bg-green-100 text-green-700">
            Klarad (30d)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border-2 border-green-300 bg-white text-green-600">
            Klarad (äldre)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700">
            Pågående
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-dashed border-gray-400 bg-gray-50 text-gray-500">
            Ej startad
          </span>
        </div>
        <div className="space-y-4">
          {operationMasteryBoards.map(item => (
            <div key={item.operation}>
              <p className="text-sm font-medium text-gray-700 mb-1">{getOperationLabel(item.operation)}</p>
              <OperationMasteryRows
                operation={item.operation}
                historical={item.historical}
                onSelectLevel={onSelectLevel}
              />
            </div>
          ))}
        </div>
        {!operationMasteryBoards.some(board => board.historical.some(level => level.status !== 'empty')) && (
          <p className="mt-3 text-sm text-gray-500">Inga sparade svar i nivåträningen.</p>
        )}
      </section>

      <section className="mt-4 border-t border-gray-200 pt-3" aria-labelledby="geometry-progress-title">
        <h3 id="geometry-progress-title" className="text-sm font-semibold text-gray-800">Geometri</h3>
        <ul className="divide-y divide-gray-100">
          {geometryProgress.map(area => <AreaProgressRow key={area.id} label={area.label} onStart={() => onStartGeometryPractice(area.id)}>
            {area.tried ? <>
              {area.tried} av {area.total} begrepp prövade · Rätt på {area.recentCorrect} av {area.recentCount} senaste svar
            </> : 'Ej påbörjat'}
          </AreaProgressRow>)}
        </ul>
      </section>

      <section className="mt-4 border-t border-gray-200 pt-3" aria-labelledby="concept-progress-title">
        <h3 id="concept-progress-title" className="text-sm font-semibold text-gray-800">Begrepp</h3>
        {conceptProgress.some(area => area.turned || area.answered) && <p className="mt-1 text-xs text-gray-500">Senaste övade omgången per område</p>}
        <ul className="divide-y divide-gray-100">
          {conceptProgress.map(area => <AreaProgressRow key={area.id} label={area.label} onStart={() => onStartConceptPractice(area.id)}>
            {area.turned || area.answered ? <>
              {area.turned} av {area.cardTotal} kort vända · {area.answered} av {area.exerciseTotal} övningar besvarade
              {area.answered > 0 && <> · {area.correct} rätt på första försöket</>}
            </> : 'Ej påbörjat'}
          </AreaProgressRow>)}
        </ul>
      </section>
    </div>
  )
}
