import { getOperationLabel } from '../../../lib/operations'
import { isKnownMode } from './sessionUtils'

function SessionModeBanner({ assignment, mode, tableSet, fixedLevel = null }) {
  let title = 'Blandad träning'

  if (assignment?.kind === 'ncm') {
    const codes = Array.isArray(assignment.ncmCodes) ? assignment.ncmCodes.filter(Boolean) : []
    title = `Uppdrag: ${assignment.title}${codes.length > 0 ? ` | ${codes.join(', ')}` : ''}`
  } else if (assignment) {
    title = `Uppdrag: ${assignment.title} · nivå ${assignment.minLevel}-${assignment.maxLevel}`
  } else if (tableSet.length > 0) {
    title = `Tabellträning: ${tableSet.map(table => `${table}:an`).join(', ')}`
  } else if (mode && isKnownMode(mode)) {
    title = [
      getOperationLabel(mode),
      Number.isInteger(fixedLevel) ? `nivå ${fixedLevel}` : ''
    ].filter(Boolean).join(' · ')
  }

  return <h2 className="mb-5 text-lg sm:text-xl font-semibold text-gray-700">{title}</h2>
}

export default SessionModeBanner
