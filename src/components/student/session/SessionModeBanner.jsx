import { getOperationLabel } from '../../../lib/operations'
import { isKnownMode } from './sessionUtils'

function SessionModeBanner({
  assignment,
  mode,
  tableSet,
  fixedLevel = null
}) {
  if (!assignment) {
    if (tableSet.length > 0) {
      return (
        <div className="mb-5 bg-white border border-orange-200 text-orange-700 rounded-lg px-4 py-2 text-sm">
          Tabellträning: {tableSet.map(table => `${table}:an`).join(', ')}
        </div>
      )
    }

    if (mode && isKnownMode(mode)) {
      const modeText = [
        getOperationLabel(mode),
        Number.isInteger(fixedLevel) ? `nivå ${fixedLevel}` : ''
      ].filter(Boolean).join(' · ')

      return (
        <div className="mb-5 bg-white border border-emerald-200 text-emerald-700 rounded-lg px-4 py-2 text-sm">
          <span>{modeText}</span>
        </div>
      )
    }
    return (
      <div className="mb-5 bg-white border border-blue-100 text-blue-700 rounded-lg px-4 py-2 text-sm">
        Blandad träning
      </div>
    )
  }

  if (assignment.kind === 'ncm') {
    const codes = Array.isArray(assignment.ncmCodes) ? assignment.ncmCodes.filter(Boolean) : []
    const codeText = codes.length > 0 ? ` | ${codes.join(', ')}` : ''
    return (
      <div className="mb-5 bg-white border border-indigo-200 text-indigo-700 rounded-lg px-4 py-2 text-sm">
        Uppdrag: {assignment.title}{codeText}
      </div>
    )
  }

  return (
    <div className="mb-5 bg-white border border-indigo-200 text-indigo-700 rounded-lg px-4 py-2 text-sm">
      Uppdrag: {assignment.title} · nivå {assignment.minLevel}-{assignment.maxLevel}
    </div>
  )
}

export default SessionModeBanner
