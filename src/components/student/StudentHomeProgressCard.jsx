import { getOperationLabel } from '../../lib/operations'
import OperationMasteryRows from './OperationMasteryRows'

export default function StudentHomeProgressCard({
  operationMasteryBoards,
  onSelectLevel,
  hasRecentProblems,
  masteryMinAttempts,
  masteryMinSuccessRate
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Framsteg</h2>
      <p className="text-xs text-gray-500 mb-3">
        Alla nivåer 1-12 visas. Grön = klarad (minst {masteryMinAttempts} försök och minst {Math.round(masteryMinSuccessRate * 100)}% rätt), blå = pågående, transparent = ej tränad ännu.
      </p>
      <p className="text-xs text-gray-500 mb-3">
        Tryck på en nivå-ruta för att öva just den nivån.
      </p>
      <div className="flex flex-wrap gap-2 text-[11px] mb-4">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-green-200 bg-green-50 text-green-700">
          Klarad
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700">
          Pågående
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-400 opacity-60">
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
      {!hasRecentProblems && (
        <p className="text-sm text-gray-500 mt-4">Ingen träningshistorik ännu.</p>
      )}
    </div>
  )
}
