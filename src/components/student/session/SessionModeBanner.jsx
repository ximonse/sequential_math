import { getOperationLabel } from '../../../lib/operations'
import { getProgressionModeLabel } from '../../../lib/progressionModes'
import { isKnownMode } from './sessionUtils'

function SessionModeBanner({ assignment, mode, tableSet, progressionMode, fixedLevel = null }) {
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
      return (
        <div className="mb-5 bg-white border border-emerald-200 text-emerald-700 rounded-lg px-4 py-2 text-sm">
          Läge: {getOperationLabel(mode)}
          {Number.isInteger(fixedLevel) ? ` | Nivåfokus ${fixedLevel}` : ''}
          {' | '}
          Tempo: {paceLabel}
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
