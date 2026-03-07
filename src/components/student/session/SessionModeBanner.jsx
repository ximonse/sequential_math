import { getOperationLabel } from '../../../lib/operations'
import { getProgressionModeLabel } from '../../../lib/progressionModes'
import { isKnownMode } from './sessionUtils'

function SessionModeBanner({
  assignment,
  mode,
  tableSet,
  progressionMode,
  fixedLevel = null,
  nextLevelAction = null,
  onGoToNextLevel = null
}) {
  const paceLabel = getProgressionModeLabel(progressionMode)
  if (!assignment) {
    if (tableSet.length > 0) {
      return (
        <div className="mb-5 bg-white border border-orange-200 text-orange-700 rounded-lg px-4 py-2 text-sm">
          Läge: Tabellövning | {tableSet.join(',')}:an | Tempo: {paceLabel}
        </div>
      )
    }

    if (mode && isKnownMode(mode)) {
      const modeText = [
        `Läge: ${getOperationLabel(mode)}`,
        Number.isInteger(fixedLevel) ? `Nivåfokus ${fixedLevel}` : '',
        `Tempo: ${paceLabel}`
      ].filter(Boolean).join(' | ')

      return (
        <div className="mb-5 bg-white border border-emerald-200 text-emerald-700 rounded-lg px-4 py-2 text-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="sm:flex-1">{modeText}</span>
            {nextLevelAction && typeof onGoToNextLevel === 'function' && (
              <button
                type="button"
                onClick={onGoToNextLevel}
                className="self-end sm:self-auto sm:ml-auto font-semibold underline underline-offset-2 text-emerald-700 hover:text-emerald-900"
              >
                {nextLevelAction.label || 'Nästa nivå'}
              </button>
            )}
          </div>
        </div>
      )
    }
    return (
      <div className="mb-5 bg-white border border-blue-100 text-blue-700 rounded-lg px-4 py-2 text-sm">
        Läge: Fri träning | Tempo: {paceLabel}
      </div>
    )
  }

  if (assignment.kind === 'ncm') {
    const codes = Array.isArray(assignment.ncmCodes) ? assignment.ncmCodes.filter(Boolean) : []
    const codeText = codes.length > 0 ? ` | ${codes.join(', ')}` : ''
    return (
      <div className="mb-5 bg-white border border-indigo-200 text-indigo-700 rounded-lg px-4 py-2 text-sm">
        Läge: NCM-uppdrag | {assignment.title}{codeText} | Tempo: {paceLabel}
      </div>
    )
  }

  return (
    <div className="mb-5 bg-white border border-indigo-200 text-indigo-700 rounded-lg px-4 py-2 text-sm">
      Läge: Uppdrag | {assignment.title} | Nivå {assignment.minLevel}-{assignment.maxLevel} | Tempo: {paceLabel}
    </div>
  )
}

export default SessionModeBanner
